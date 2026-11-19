import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import XLSX from 'xlsx';

import { environment } from '@/environment.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { OoxmlReader } from '@/services/ooxml-reader.js';
import { bufferStream } from '@/utils/buffer.js';
import { openMediaSource } from '@/utils/open-source.js';

import type { XlsxBuildType, XlsxExtractType, XlsxMetadataType, XlsxSheetType } from './schema.js';

/** The only OOXML spreadsheet mime accepted: macro-enabled and template files are rejected. */
const SPREADSHEET_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * The scanner sees declared content types only; verify the bytes too.
 * The signature must be the plain spreadsheet OOXML mime, so renamed images and .xlsm are rejected.
 * @param buffer - The buffered upload.
 */
const assertXlsxSignature = async (buffer: Buffer): Promise<void> => {
  const signature = await fileTypeFromBuffer(buffer);
  if (signature?.mime !== SPREADSHEET_MIME) {
    throw new UnsupportedMediaTypeException('Uploaded bytes are not a plain .xlsx workbook');
  }
};

/** Total uncompressed byte ceiling for xlsx archives; ~3.5x tighter than the shared cap. */
const XLSX_TOTAL_UNCOMPRESSED = 64 * 1024 * 1024;

/**
 * Counts <c> cell tags across worksheets; a cheap pre-parse bomb guard (no XML decoding).
 * @param parts - The validated OOXML parts (worksheet parts only are scanned).
 * @returns The total number of cell tags found.
 */
const countCells = (parts: Map<string, Buffer>): number => {
  let total = 0;
  for (const [name, part] of parts) {
    if (!name.startsWith('xl/worksheets/') || !name.endsWith('.xml')) continue;
    const xml = part.toString('latin1');
    total += xml.match(/<c[\s>]/g)?.length ?? 0;
  }
  return total;
};

/**
 * Reads the uploaded workbook into memory, bounded by the scanner cap.
 * The scanner only opens the source when ClamAV is enabled, so the service must too.
 * Applies the OOXML zip-bomb caps and a worksheet cell ceiling before SheetJS sees a byte.
 * @param cls - Normalized request context (source stream accessors).
 * @param maxCells - Reject archives whose worksheets carry more cells than this.
 * @returns The workbook bytes, capped.
 * @throws {UnsupportedMediaTypeException} For over-broad mimes or wrong signatures.
 * @throws {BadRequestException} For zip structures exceeding the OOXML caps.
 * @throws {PayloadTooLargeException} For archives with too many cells.
 */
const readBody = async (
  cls: NormalizedClsService,
  maxCells: number,
): Promise<Buffer> => {
  const contentType = String(cls.request()?.headers?.['content-type'] ?? '');
  const mime = contentType.split(';', 1)[0]?.trim() ?? ''; // split always yields a first element; the ?? '' is for the type system
  if (mime !== SPREADSHEET_MIME && mime !== 'application/octet-stream') {
    throw new UnsupportedMediaTypeException(`Unsupported media type "${mime}" for XLSX input`);
  }
  await openMediaSource(cls);
  const stream = cls.sourceStream().get();
  if (!stream) {
    throw new BadRequestException({ code: 'XLSX_NO_SOURCE', message: 'XLSX body is missing' });
  }
  const buffer = await bufferStream(stream, environment.CLAMAV_MAX_BYTES);
  let parts: Map<string, Buffer>;
  try {
    parts = OoxmlReader.readParts(buffer, { maxTotalUncompressed: XLSX_TOTAL_UNCOMPRESSED });
  } catch {
    // Everything readParts throws is fatal for this input; map it to a 400.
    throw new BadRequestException({ code: 'XLSX_INVALID_ZIP', message: 'corrupt zip structure' });
  }
  const cells = countCells(parts);
  if (cells > maxCells) {
    throw new PayloadTooLargeException(`workbook exceeds the ${maxCells} cell cap`);
  }
  await assertXlsxSignature(buffer);
  return buffer;
};

/**
 * Maps a SheetJS failure to a 400.
 * @param error - The error thrown by SheetJS.
 * @returns A 400 exception carrying the message.
 */
const toBadRequest = (error: unknown): BadRequestException => {
  const message = error instanceof Error ? error.message : String(error);
  return new BadRequestException({ code: 'XLSX_PARSE_ERROR', message });
};

/**
 * Formulas with DDE or remote-execution payloads are refused; ordinary functions pass through.
 * Anchored at ^ with optional leading whitespace; `!cmd|...` style payloads are also refused.
 */

const UNSAFE_FORMULA = [
  /^\s*(cmd|powershell|mshta|rundll32|wscript|cscript|regsvr32)\s*\|/i,
  /(^|!)\s*DDEAUTO/i,
  /^\s*webservice\s*\(/i,
  /^\s*dde\s*\(/i,
];

/**
 * Walks every cell once and rejects unsafe formulas.
 * @param sheets - The validated sheet descriptors.
 */
const assertSafeCells = (sheets: XlsxSheetType[]): void => {
  for (const sheet of sheets) {
    for (const row of sheet.rows) {
      for (const cell of Array.isArray(row) ? row : Object.values(row)) {
        assertSafeCell(cell);
      }
    }
  }
};

/**
 * Rejects a formula string with a code-execution vector.
 * @param f - The formula, without a leading equals sign.
 */
const assertSafeFormula = (f: string): void => {
  if (f.startsWith('=')) {
    throw new BadRequestException({
      code: 'XLSX_FORMULA_LEADING_EQUALS',
      message: 'SheetJS formulas must not start with "="',
    });
  }
  for (const pattern of UNSAFE_FORMULA) {
    if (pattern.test(f)) {
      throw new BadRequestException({
        code: 'XLSX_FORMULA_REJECTED',
        message: 'formula rejected as unsafe (DDE/remote-execution pattern)',
      });
    }
  }
};

/**
 * Rejects cell objects whose formula opens a code-execution vector on file open.
 * @param cell - One candidate cell (passed through by the build payload).
 */
const assertSafeCell = (cell: unknown): void => {
  if (!cell || typeof cell !== 'object' || !('f' in cell)) return;
  const f = (cell as Record<'f', unknown>)['f'];
  if (typeof f === 'string') assertSafeFormula(f);
};

/**
 * Looks up a worksheet by exact name without prototype-index access.
 * @param sheets - The workbook's worksheet map.
 * @param name - Exact sheet name to find.
 * @returns The worksheet, or undefined when absent.
 */
const findSheet = (
  sheets: Record<string, XLSX.WorkSheet>,
  name: string,
): undefined | XLSX.WorkSheet =>
  Object.entries(sheets).find(([key]) => key === name)?.[1];

/**
 * Finds the sheet index by name or number; throws 400 when absent.
 * Exact names win over numeric indices, so a sheet called "2024" is addressable by name.
 * @param names - The workbook's ordered sheet names.
 * @param sheet - Name or 0-based index; undefined means the first sheet.
 * @returns The resolved index.
 */
const sheetIndex = (names: string[], sheet: string | undefined): number => {
  if (sheet === undefined) return 0;
  const exact = names.indexOf(sheet);
  if (exact !== -1) return exact;
  if (!/^\d+$/.test(sheet)) {
    throw new BadRequestException({
      code: 'XLSX_SHEET_NOT_FOUND',
      message: `sheet "${sheet}" not found (have: ${names.join(', ')})`,
    });
  }
  const asNumber = Number(sheet);
  if (asNumber >= names.length) {
    throw new BadRequestException({
      code: 'XLSX_SHEET_NOT_FOUND',
      message: `sheet index ${asNumber} out of range (0-${names.length - 1})`,
    });
  }
  return asNumber;
};

@Injectable()
export class XlsxService {
  constructor(private readonly cls: NormalizedClsService) {}

  /**
   * Builds a workbook from the payload and returns the .xlsx bytes.
   * Cell objects pass through to SheetJS (formulas, number formats, links, comments).
   * Styles, images, charts and panes are SheetJS Pro-only and not supported.
   * @param body - Validated build payload.
   * @returns The workbook bytes.
   */
  async build(body: XlsxBuildType): Promise<Buffer> {
    try {
      assertSafeCells(body.sheets);
      const workbook = XLSX.utils.book_new();
      const visibility: Array<0 | 1 | 2> = [];
      for (const sheet of body.sheets) {
        const worksheet = buildSheet(sheet);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name, true);
        visibility.push(sheet.sheetVisibility ?? 0);
      }
      if (body.workbook?.Props) workbook.Props = body.workbook.Props;
      if (body.workbook?.WBProps?.date1904) {
        // SheetJS serializes Date cells with the 1900 epoch even under date1904; refuse silent corruption.
        throw new BadRequestException({
          code: 'XLSX_DATE1904_UNSUPPORTED',
          message: 'date1904 workbooks are not supported for writing',
        });
      }
      if (body.workbook?.WBProps) {
        workbook.Workbook = workbook.Workbook ?? {};
        workbook.Workbook.WBProps = { ...(workbook.Workbook.WBProps ?? {}), ...body.workbook.WBProps };
      }
      if (body.workbook?.Names) {
        for (const entry of body.workbook.Names) assertSafeFormula(entry.Ref);
        workbook.Workbook = workbook.Workbook ?? {};
        workbook.Workbook.Names = body.workbook.Names;
      }
      if (visibility.some((value) => value !== 0)) {
        workbook.Workbook = workbook.Workbook ?? {};
        // book_append_sheet only fills SheetNames/Sheets; the visibility array tracks creation order.
        workbook.Workbook.Sheets = visibility.map((Hidden) => ({ Hidden }));
      }
      // write() validates the assembled workbook; map any failure to a 400.
      return XLSX.write(workbook, { bookType: 'xlsx', cellDates: true, compression: true, type: 'buffer' }) as Buffer;
    } catch (error) {
      // Preserve our own client errors; map everything else to a 400.
      if (error instanceof BadRequestException) throw error;
      throw toBadRequest(error);
    }
  }

  /**
   * Extracts one sheet as typed JSON. Object rows need a header: pass
   * `header=1` (AOA) for raw rows, `header=A` for column letters, or a
   * comma-separated header list; omit `header` to use the first row as keys.
   * @param query - Validated flat reader options.
   * @returns The sheet name plus the records.
   */
  async extract(query: XlsxExtractType) {
    const buffer = await readBody(this.cls, query.maxCells);
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { cellDates: true });
    } catch {
      // SheetJS tolerates malformed XML; only structural zip/container failures land here.
      throw new BadRequestException({ code: 'XLSX_PARSE_ERROR', message: 'unreadable workbook' });
    }
    const index = sheetIndex(workbook.SheetNames, query.sheet);
    const sheetName = workbook.SheetNames.slice(index, index + 1)[0];
    if (sheetName === undefined) {
      throw new BadRequestException({ code: 'XLSX_SHEET_NOT_FOUND', message: 'sheet index out of range' });
    }
    const worksheet = findSheet(workbook.Sheets, sheetName);
    if (!worksheet) {
      throw new BadRequestException({ code: 'XLSX_SHEET_NOT_FOUND', message: `sheet ${sheetName} missing` });
    }
    const defval: unknown = query.raw ? null : '';
    const options: XLSX.Sheet2JSONOpts = {
      blankrows: query.blankrows,
      dateNF: query.dateNF,
      defval,
      raw: query.raw,
      skipHidden: query.skipHidden,
    };
    if (query.header === '1') options.header = 1;
    else if (query.header === 'A') options.header = 'A';
    else if (query.header) {
      const parts = query.header.split(',').map((part) => part.trim());
      if (parts.some((part) => part.length === 0)) {
        throw new BadRequestException({
          code: 'XLSX_HEADER_EMPTY_COLUMN',
          message: 'header contains an empty column name',
        });
      }
      options.header = parts;
    }
    try {
      const records: unknown[] = XLSX.utils.sheet_to_json(worksheet, options);
      return { records, sheet: sheetName };
    } catch (error) {
      throw toBadRequest(error);
    }
  }

  /**
   * Structural metadata for an uploaded workbook: dims, counts, props, names,
   * formula inventory and a per-type cell census, capped at `maxCells`.
   * @param query - Validated flat metadata options.
   * @returns The metadata document.
   */
  async metadata(query: XlsxMetadataType) {
    const buffer = await readBody(this.cls, query.maxCells);
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { bookProps: false, cellDates: true });
    } catch {
      throw new BadRequestException({ code: 'XLSX_PARSE_ERROR', message: 'unreadable workbook' });
    }
    // SheetNames and Workbook.Sheets[] share creation order; zip them in one pass.
    // (Sheets themselves stay keyed by name via findSheet; this zip only carries visibility.)
    const sheetProps = (workbook.Workbook?.Sheets ?? [])[Symbol.iterator]();
    const parts = workbook.SheetNames.map((name) => ({
      hidden: sheetProps.next().value?.Hidden ?? 0,
      name,
    }));

    let totalCells = 0;
    const sheets = parts.map(({ hidden, name }) => {
      const worksheet = findSheet(workbook.Sheets, name);
      const range = worksheet?.['!ref'];
      if (!worksheet || !range) {
        return {
          autofilter: false,
          cells: 0,
          cols: 0,
          formulas: 0,
          hidden: hidden !== 0,
          merges: 0,
          name,
          ref: null,
          rows: 0,
          types: Object.fromEntries(emptyTypes()),
        };
      }
      // SheetJS recomputes !ref from cells, so this range is always valid.
      const decoded: XLSX.Range = XLSX.utils.decode_range(range);
      const rows = decoded.e.r - decoded.s.r + 1;
      const cols = decoded.e.c - decoded.s.c + 1;
      const cells = rows * cols;
      totalCells += cells;
      let formulas = 0;
      const types = emptyTypes();
      for (const [key, cell] of Object.entries(worksheet)) {
        if (key.startsWith('!')) continue;
        const typed = cell as XLSX.CellObject;
        types.set(typed.t, (types.get(typed.t) ?? 0) + 1);
        if (typed.f) formulas += 1;
      }
      return {
        autofilter: !!worksheet['!autofilter'],
        cells,
        cols,
        formulas,
        hidden: hidden !== 0,
        merges: worksheet['!merges']?.length ?? 0,
        name,
        ref: range,
        rows,
        types: Object.fromEntries(types),
      };
    });
    return {
      custprops: workbook.Custprops ?? {},
      definedNames: (workbook.Workbook?.Names ?? []).map((entry) => ({
        name: entry.Name,
        ref: entry.Ref,
        sheet: entry.Sheet,
      })),
      props: workbook.Props ?? {},
      sheets,
      totalCells,
    };
  }
}

/**
 * Builds one worksheet from the payload's sheet options.
 * @param sheet - The validated sheet descriptor.
 * @returns The populated SheetJS worksheet.
 */
const buildSheet = (sheet: XlsxSheetType): XLSX.WorkSheet => {
  const aoa: Array<Array<unknown>> = [];
  const objects: Array<Record<string, unknown>> = [];
  for (const row of sheet.rows) {
    if (Array.isArray(row)) aoa.push(row);
    else objects.push(values2cells(row, sheet.columns));
  }
  if (aoa.length !== 0 && objects.length !== 0) {
    throw new BadRequestException({
      code: 'XLSX_MIXED_ROW_KINDS',
      message: 'rows must be all arrays or all objects, not mixed',
    });
  }
  const worksheet =
    aoa.length > 0
      ? XLSX.utils.aoa_to_sheet(aoa, { cellDates: sheet.cellDates ?? true })
      : XLSX.utils.json_to_sheet(objects, {
          cellDates: sheet.cellDates ?? true,
          header: sheet.columns,
        });
  if (sheet.merges) worksheet['!merges'] = sheet.merges.map((merge) => XLSX.utils.decode_range(merge));
  if (sheet.cols) worksheet['!cols'] = sheet.cols;
  if (sheet.autofilter) worksheet['!autofilter'] = { ref: sheet.autofilter };
  return worksheet;
};

/**
 * Strips prototype-polluting keys from object rows (json_to_sheet does not).
 * @param row - The raw object row.
 * @param columns - Optional column-order lock; keys not listed are dropped.
 * @returns A clean row object safe for json_to_sheet.
 */
const values2cells = (
  row: Record<string, unknown>,
  columns: string[] | undefined,
): Record<string, unknown> => {
  const allowed = columns ? new Set(columns) : undefined;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    if (allowed && !allowed.has(key)) continue;
    // Proto keys are filtered above; dynamic assignment is the point of the helper.
    // eslint-disable-next-line security/detect-object-injection
    clean[key] = value;
  }
  return clean;
};

/**
 * Zeroed per-type census for a sheet.
 * @returns A zeroed map from SheetJS cell type tag to count.
 */
const emptyTypes = (): Map<string, number> =>
  new Map([
    ['b', 0],
    ['d', 0],
    ['e', 0],
    ['n', 0],
    ['s', 0],
    ['z', 0],
  ]);
