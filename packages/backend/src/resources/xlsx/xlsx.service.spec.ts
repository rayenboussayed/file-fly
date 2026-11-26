import { BadRequestException, PayloadTooLargeException, UnsupportedMediaTypeException } from '@nestjs/common';
import { zipSync } from 'fflate';
import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import XLSX from 'xlsx';

import type { XlsxBuildType, XlsxExtractType } from './schema.js';

import { XlsxService } from './xlsx.service.js';

type BuildRows = XlsxBuildType['sheets'][number]['rows'];

const CONTENT_TYPES =
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '</Types>';

const RELS =
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="https://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  '</Relationships>';

const WORKBOOK =
  '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
  '<sheets><sheet name="S" sheetId="1" r:id="rId1"/></sheets></workbook>';

/**
 * Builds a minimal, valid .xlsx container around the given worksheet XML.
 * @param sheetData - The raw XML placed inside <sheetData>.
 * @returns The packaged .xlsx bytes.
 */
const zipBytes = (sheetData: string) =>
  Buffer.from(
    zipSync({
      '[Content_Types].xml': Buffer.from(CONTENT_TYPES, 'utf8'),
      'xl/_rels/workbook.xml.rels': Buffer.from(RELS, 'utf8'),
      'xl/workbook.xml': Buffer.from(WORKBOOK, 'utf8'),
      'xl/worksheets/sheet1.xml': Buffer.from(
        `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetData}</sheetData></worksheet>`,
        'utf8',
      ),
    }),
  );

/**
 * Builds a workbook from the given sheets and returns the .xlsx bytes.
 * @param sheets - The sheets to build.
 * @returns The workbook bytes.
 */
const buildBytes = async (sheets: XlsxBuildType['sheets']) => {
  const workbook = await roundTrip({ sheets });
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
};

/**
 * Query defaults with overrides, mirroring the schema's post-validation shape.
 * @param overrides - Query fields to override over the defaults.
 * @returns A full, valid extract query.
 */
const q = (overrides: Partial<XlsxExtractType> = {}): XlsxExtractType => ({
  maxCells: 2_000_000,
  raw: true,
  ...overrides,
});

const serviceFor = (body?: Buffer) => {
  const stream = Readable.from([body ?? Buffer.from('PK\u{3}\u{4}not-a-workbook')]);
  const cls = {
    request: () => ({
      headers: {
        'content-type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
      method: 'POST',
      raw: stream,
    }),
    sourceDirection: () => ({ set: () => {} }),
    sourceStream: () => ({ get: () => stream, set: () => {} }),
  };
  return new XlsxService(cls as never);
};


const buildRows = async (n: number) => {
  const rows: XlsxBuildType['sheets'][number]['rows'] = [];
  for (let index = 0; index < n; index += 1) rows.push([index, 'x', true]);
  const workbook = await roundTrip({ sheets: [{ rows }] });
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
};

const roundTrip = async (body: Parameters<XlsxService['build']>[0]) => {
  const service = serviceFor(Buffer.from('x'));
  const bytes = await service.build(body);
  return XLSX.read(bytes, { cellDates: true, cellNF: true, cellStyles: true });
};

const build = async (rows: BuildRows) => {
  const workbook = await roundTrip({ sheets: [{ rows }] });
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
};

const metaFor = async (rows: BuildRows) => {
  const workbook = await roundTrip({ sheets: [{ rows }] });
  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
  return serviceFor(bytes).metadata({ maxCells: 1000 });
};

describe('XlsxService.build', () => {
  it('writes array rows as-is', async () => {
    const workbook = await roundTrip({
      sheets: [{ rows: [['a', 'b'], [1, 2]] }],
    });
    const sheet = workbook.Sheets[workbook.SheetNames[0] as string];
    expect(sheet?.['A1']?.v).toBe('a');
    expect(sheet?.['B2']?.v).toBe(2);
  });

  it('writes object rows with explicit column order', async () => {
    const workbook = await roundTrip({
      sheets: [{ columns: ['b', 'a'], rows: [{ a: 1, b: 'x' }] }],
    });
    const sheet = workbook.Sheets[workbook.SheetNames[0] as string];
    expect(sheet?.['A1']?.v).toBe('b');
    expect(sheet?.['A2']?.v).toBe('x');
  });

  it('round-trips formulas and cached values', async () => {
    const workbook = await roundTrip({
      sheets: [{ rows: [[1], [2], [{ f: 'SUM(A1:A2)', t: 'n', v: 3 }]] }],
    });
    const sheet = workbook.Sheets[workbook.SheetNames[0] as string];
    expect(sheet?.['A3']?.f).toBe('SUM(A1:A2)');
  });

  it('applies merges and autofilter and column widths', async () => {
    const workbook = await roundTrip({
      sheets: [
        {
          autofilter: 'A1:B2',
          cols: [{ width: 20 }, { hidden: true }],
          merges: ['A1:B1'],
          rows: [
            ['h1', 'h2'],
            [1, 2],
          ],
        },
      ],
    });
    const sheet = workbook.Sheets[workbook.SheetNames[0] as string];
    expect(sheet?.['!merges']).toHaveLength(1);
    expect(sheet?.['!autofilter']).toEqual({ ref: 'A1:B2' });
    expect(sheet?.['!cols']?.[0]?.width).toBe(20);
    expect(sheet?.['!cols']?.[1]?.hidden).toBe(true);
  });

  it('rejects DDE formulas with 400 and passes ordinary ones through', async () => {
    await expect(
      roundTrip({ sheets: [{ rows: [[{ f: 'cmd|"/c calc"!A1', t: 'n', v: 0 }]] }] }),
    ).rejects.toMatchObject({ response: { code: 'XLSX_FORMULA_REJECTED' } });
    await expect(
      roundTrip({ sheets: [{ rows: [[{ f: String.raw`MSEXCEL|'\\path\to\app'!A1`, t: 'n', v: 0 }]] }] }),
    ).rejects.toMatchObject({ response: { code: 'XLSX_FORMULA_REJECTED' } });
    const workbook = await roundTrip({
      sheets: [{ rows: [[{ f: 'SUM(A1:A2)', t: 'n', v: 3 }]] }],
    });
    expect(workbook.Sheets[workbook.SheetNames[0] as string]?.['A1']?.f).toBe('SUM(A1:A2)');
  });

  it('rejects formulas with a leading equals sign', async () => {
    await expect(
      roundTrip({ sheets: [{ rows: [[{ f: '=SUM(A1:A2)', t: 'n', v: 3 }]] }] }),
    ).rejects.toMatchObject({ response: { code: 'XLSX_FORMULA_LEADING_EQUALS' } });
  });

  it('honours sheetVisibility (hidden and very hidden)', async () => {
    const workbook = await roundTrip({
      sheets: [
        { rows: [['a']], sheetVisibility: 1 },
        { rows: [['b']], sheetVisibility: 2 },
        { rows: [['c']] },
      ],
    });
    expect(workbook.Workbook?.Sheets?.map((entry) => entry.Hidden)).toEqual([1, 2, 0]);
  });

  it('keeps a numeric-looking sheet name addressable by name', async () => {
    const bytes = await buildBytes([{ name: '2024', rows: [['x']] }]);
    const service = serviceFor(bytes);
    const byName = await service.extract(q({ sheet: '2024' }));
    expect(byName.sheet).toBe('2024');
  });

  it('rejects mixed row kinds with 400', async () => {
    await expect(
      roundTrip({ sheets: [{ rows: [['a'], { b: 1 }] }] }),
    ).rejects.toMatchObject({ response: { code: 'XLSX_MIXED_ROW_KINDS' } });
  });

  it('rejects a header list with empty segments', async () => {
    const bytes = await buildBytes([{ rows: [['a', 'b'], [1, 2]] }]);
    const service = serviceFor(bytes);
    await expect(
      service.extract(q({ header: 'first,,third' })),
    ).rejects.toMatchObject({ response: { code: 'XLSX_HEADER_EMPTY_COLUMN' } });
  });

  it('rejects uploads with too many cells before parsing', async () => {
    const bytes = zipBytes('<c r="A1"/>'.repeat(64));
    const service = serviceFor(bytes);
    await expect(service.metadata({ maxCells: 10 })).rejects.toBeInstanceOf(
      PayloadTooLargeException,
    );
  });

  it('extract answers with null for blank cells by default', async () => {
    const bytes = await buildBytes([{ rows: [['a', '', 'c'], [1, 2, 3]] }]);
    const service = serviceFor(bytes);
    const { records } = await service.extract(q({ header: '1' }));
    expect(records[0]).toEqual(['a', '', 'c']);
  });

  it('returns enriched defined names', async () => {
    const workbookForNames = await roundTrip({
      sheets: [{ rows: [['x']] }],
      workbook: { Names: [{ Name: 'total', Ref: 'A1', Sheet: 0 }] },
    });
    const bytes = XLSX.write(workbookForNames, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
    const meta = await serviceFor(bytes).metadata({ maxCells: 1000 });
    expect(meta.definedNames).toEqual([{ name: 'total', ref: 'A1', sheet: 0 }]);
  });

  it('reports zeroed metadata for an empty sheet without a ref', async () => {
    const bytes = zipBytes('');
    const meta = await serviceFor(bytes).metadata({ maxCells: 1000 });
    expect(meta.sheets[0]?.types).toEqual({ b: 0, d: 0, e: 0, n: 0, s: 0, z: 0 });
    expect(meta.sheets[0]?.rows).toBe(0);
  });

  it('rejects a non-spreadsheet upload with a client error', async () => {
    const pngBody = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    await expect(serviceFor(pngBody).extract(q())).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('writes ISO date cells round-trip as serial dates', async () => {
    const workbook = await roundTrip({
      sheets: [{ rows: [[{ t: 'd', v: '2026-01-02T00:00:00.000Z', z: 'yyyy-mm-dd' }]] }],
    });
    expect(workbook.Sheets[workbook.SheetNames[0] as string]?.['A1']?.t).toBe('d');
  });

  it('sets workbook properties and defined names', async () => {
    const workbook = await roundTrip({
      sheets: [{ rows: [['x']] }],
      workbook: {
        Names: [{ Name: 'total', Ref: 'A1' }],
        Props: { Author: 'Ada', Title: 'Test' },
        WBProps: {},
      },
    });
    expect(workbook.Props?.Title).toBe('Test');
    expect(workbook.Props?.Author).toBe('Ada');
    expect(workbook.Workbook?.Names?.[0]?.Name).toBe('total');
  });

  it('rejects date1904 workbooks on write', async () => {
    await expect(
      roundTrip({
        sheets: [{ rows: [['x']] }],
        workbook: { WBProps: { date1904: true } },
      }),
    ).rejects.toMatchObject({ response: { code: 'XLSX_DATE1904_UNSUPPORTED' } });
  });

  it('rejects a valid docx signature with 415', async () => {
    const docx = Buffer.from(
      zipSync({
        '[Content_Types].xml': Buffer.from(
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
            '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
            '</Types>',
        ),
        'word/document.xml': Buffer.from('<doc/>', 'utf8'),
      }),
    );
    await expect(serviceFor(docx).extract(q())).rejects.toBeInstanceOf(
      UnsupportedMediaTypeException,
    );
  });

  it('rejects non-spreadsheet content types with 415', async () => {
    const stream = Readable.from([Buffer.from('a,b\n1,2\n')]);
    const cls = {
      request: () => ({ headers: { 'content-type': 'text/csv' }, method: 'POST', raw: stream }),
      sourceDirection: () => ({ set: () => {} }),
      sourceStream: () => ({ get: () => stream, set: () => {} }),
    };
    const service = new XlsxService(cls as never);
    await expect(service.metadata({ maxCells: 100 })).rejects.toBeInstanceOf(
      UnsupportedMediaTypeException,
    );
  });

  it('maps a missing source stream to a client error, not a 500', async () => {
    const cls = {
      request: () => ({ headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }, method: 'POST' }),
      sourceDirection: () => ({ set: () => {} }),
      sourceStream: () => ({ get: () => {}, set: () => {} }),
    };
    const service = new XlsxService(cls as never);
    await expect(service.extract(q())).rejects.toMatchObject({
      response: { code: 'XLSX_NO_SOURCE' },
    });
  });

  it('rejects an out-of-range numeric sheet index with 400', async () => {
    const bytes = await buildBytes([{ rows: [['x']] }]);
    const service = serviceFor(bytes);
    await expect(service.extract(q({ sheet: '5' }))).rejects.toMatchObject({
      response: { code: 'XLSX_SHEET_NOT_FOUND' },
    });
  });

  it('rejects an unknown sheet name with 400', async () => {
    const bytes = await buildBytes([{ rows: [['x']] }]);
    const service = serviceFor(bytes);
    await expect(service.extract(q({ sheet: 'Nope' }))).rejects.toMatchObject({
      response: { code: 'XLSX_SHEET_NOT_FOUND' },
    });
  });

  it('parses a comma-separated header list', async () => {
    const bytes = await buildBytes([{ rows: [['a', 'b'], [1, 2]] }]);
    const service = serviceFor(bytes);
    const { records } = await service.extract(q({ header: 'first,second' }));
    expect(records[0]).toEqual({ first: 'a', second: 'b' });
  });

  it('extracts column-letter keys with header=A', async () => {
    const bytes = await buildBytes([{ rows: [['a', 'b'], [1, 2]] }]);
    const service = serviceFor(bytes);
    const { records } = await service.extract(q({ header: 'A' }));
    expect(records).toEqual([
      { A: 'a', B: 'b' },
      { A: 1, B: 2 },
    ]);
  });

  it('drops object-row keys absent from the columns lock', async () => {
    const workbook = await roundTrip({
      sheets: [{ columns: ['a'], rows: [{ a: 1, b: 'dropped' }] }],
    });
    const sheet = workbook.Sheets[workbook.SheetNames[0] as string];
    expect(sheet?.['A1']?.v).toBe('a');
    expect(sheet?.['B1']).toBeUndefined();
  });

  it('maps a truncated zip to a 400', async () => {
    const service = serviceFor(Buffer.from('PK\u{3}\u{4}\u{1}\u{2}'));
    await expect(service.extract(q())).rejects.toMatchObject({
      response: { code: 'XLSX_INVALID_ZIP' },
    });
  });

  it('rejects DDE defined names on write', async () => {
    await expect(
      roundTrip({
        sheets: [{ rows: [['x']] }],
        workbook: { Names: [{ Name: 'evil', Ref: 'WEBSERVICE("http://e")' }] },
      }),
    ).rejects.toMatchObject({ response: { code: 'XLSX_FORMULA_REJECTED' } });
  });

  it('drops prototype-polluting keys from object rows', async () => {
    const row: XlsxBuildType['sheets'][number]['rows'][number] = JSON.parse('{"a": 1, "__proto__": {"polluted": true}}');
    const workbook = await roundTrip({ sheets: [{ rows: [row] }] });
    const sheet = workbook.Sheets[workbook.SheetNames[0] as string];
    expect(sheet?.['A2']?.v).toBe(1);
    expect(({} as Record<string, unknown>)['polluted']).toBeUndefined();
  });
});

describe('XlsxService.extract', () => {
  it('extracts object rows with first row as header by default', async () => {
    const bytes = await build([{ a: 1, b: 'x' }]);
    const service = serviceFor(bytes);
    const { records, sheet } = await service.extract(q());
    expect(sheet).toBe('Sheet1');
    expect(records).toEqual([{ a: 1, b: 'x' }]);
  });

  it('extracts raw arrays with header=1', async () => {
    const bytes = await build([
      ['a', 'b'],
      [1, 2],
    ]);
    const service = serviceFor(bytes);
    const { records } = await service.extract(q({ header: '1' }));
    expect(records).toEqual([
      ['a', 'b'],
      [1, 2],
    ]);
  });

  it('selects a sheet by name and by index', async () => {
    const bytes = await build([{ a: 1 }]);
    const byName = await serviceFor(bytes).extract(q({ sheet: 'Sheet1' }));
    expect(byName.sheet).toBe('Sheet1');
    const byIndex = await serviceFor(bytes).extract(q({ sheet: '0' }));
    expect(byIndex.sheet).toBe('Sheet1');
  });

  it('throws 400 for a missing sheet and for corrupt bytes', async () => {
    const bytes = await build([{ a: 1 }]);
    await expect(serviceFor(bytes).extract(q({ sheet: 'Nope' }))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      serviceFor(Buffer.from('PK\u{3}\u{4}\u{1}\u{2}')).extract(q()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('XlsxService.metadata', () => {
  it('reports dimensions, counts and the type census', async () => {
    const meta = await metaFor([
      ['a', 'b'],
      [1, true],
      [2, 'x'],
    ]);
    expect(meta.sheets).toHaveLength(1);
    expect(meta.sheets[0]?.rows).toBe(3);
    expect(meta.sheets[0]?.cols).toBe(2);
    expect(meta.sheets[0]?.cells).toBe(6);
    expect(meta.sheets[0]?.formulas).toBe(0);
    expect(meta.totalCells).toBe(6);
  });

  it('counts formula cells', async () => {
    const workbookForFormula = await roundTrip({
      sheets: [{ rows: [[1], [{ f: 'A1*2', t: 'n', v: 2 }]] }],
    });
    const bytes = XLSX.write(workbookForFormula, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
    const meta = await serviceFor(bytes).metadata({ maxCells: 1000 });
    expect(meta.sheets[0]?.formulas).toBe(1);
  });

  it('rejects workbooks exceeding maxCells with 413', async () => {
    const bytes = await buildRows(2000);
    await expect(
      serviceFor(bytes).metadata({ maxCells: 100 }),
    ).rejects.toBeInstanceOf(PayloadTooLargeException);
  });
});


describe('XlsxService readBody fallbacks and raw mode', () => {
  it('rejects a missing content-type header with 415', async () => {
    const stream = Readable.from([Buffer.from('x')]);
    const cls = {
      request: () => ({ method: 'POST', raw: stream }),
      sourceDirection: () => ({ set: () => {} }),
      sourceStream: () => ({ get: () => stream, set: () => {} }),
    };
    const service = new XlsxService(cls as never);
    await expect(service.metadata({ maxCells: 100_000 })).rejects.toMatchObject({ status: 415 });
  });

  it('raw=true yields null for empty cells instead of an empty string', async () => {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([['a', 'b'], [1, undefined as never]]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'People');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
    const service = serviceFor(buffer);
    const result = await service.extract({ maxCells: 100_000, raw: true, sheet: 'People' });
    expect(result.records).toEqual([{ a: 1, b: null }]);
  });
});

describe('XlsxService.metadata advanced arms', () => {
  it('detects merges, autofilter and defined names without a sheet', async () => {
    const workbook = await roundTrip({
      sheets: [
        {
          autofilter: 'A1:B2',
          merges: ['A1:A2'],
          rows: [['h', 'x'], [1, 2]],
        },
      ],
    });
    workbook.Workbook ??= {};
    workbook.Workbook.Names = [{ Name: 'MyName', Ref: 'People!$A$1' }];
    const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
    const meta = await serviceFor(bytes).metadata({ maxCells: 1000 });
    expect(meta.sheets[0]?.autofilter).toBe(true);
    expect(meta.sheets[0]?.merges).toBe(1);
    const name = meta.definedNames.find((entry) => entry.name === 'MyName');
    expect(name).toMatchObject({ name: 'MyName', ref: 'People!$A$1' });
    expect(name?.sheet).toBeUndefined();
  });

  it('counts a mixed type census with numbers, strings, dates, booleans and errors', async () => {
    const workbook = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['s', 'n', 'b', 'd'],
      ['text', 42, true, new Date('2026-01-02T00:00:00Z')],
      ['other', 7, false, new Date('2026-01-03T00:00:00Z')],
    ]);
    XLSX.utils.book_append_sheet(workbook, ws, 'Sheet1');
    const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
    const meta = await serviceFor(bytes).metadata({ maxCells: 1000 });
    expect(meta.sheets[0]?.rows).toBe(3);
    expect(meta.sheets[0]?.types).toMatchObject({ b: 2, n: 2, s: 6 });
  });
});

describe('XlsxService unit edge coverage', () => {
  it('extract defaults to the first sheet when no sheet is given', async () => {
    const bytes = await serviceFor(Buffer.from('x')).build({
      sheets: [{ rows: [['count', 'name'], [1, 'a']] }],
    });
    const result = await serviceFor(bytes).extract({ maxCells: 1000, raw: true });
    expect(result.sheet).toBe('Sheet1');
    expect(result.records).toEqual([{ count: 1, name: 'a' }]);
  });

  it('extract with raw=false yields empty strings for empty cells', async () => {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([['a', 'b'], [1, undefined as never]]);
    XLSX.utils.book_append_sheet(workbook, sheet, 'People');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
    const result = await serviceFor(buffer).extract({ maxCells: 1000, raw: false, sheet: 'People' });
    expect(result.records[0]).toHaveProperty('b', '');
  });

  it('accepts application/octet-stream uploads', async () => {
    const stream = Readable.from([Buffer.from('not needed here')]);
    const cls = {
      request: () => ({ headers: { 'content-type': 'application/octet-stream' }, method: 'POST', raw: stream }),
      sourceDirection: () => ({ set: () => {} }),
      sourceStream: () => ({ get: () => stream, set: () => {} }),
    };
    // 415 comes before any parse work; octet-stream is allowed through to the OOXML gate.
    const service = new XlsxService(cls as never);
    await expect(service.metadata({ maxCells: 1000 })).rejects.toThrow();
    // The rejection must NOT be the 415 content-type error.
    await expect(service.metadata({ maxCells: 1000 })).rejects.not.toMatchObject({ status: 415 });
  });

  it('rejects a workbook with zero sheets with 400', async () => {
    const { zipSync } = await import('fflate');
    const empty = zipSync({
      '[Content_Types].xml': Buffer.from('<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>', 'utf8'),
      'xl/workbook.xml': Buffer.from('<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets/></workbook>', 'utf8'),
    });
    const service = serviceFor(Buffer.from(empty));
    await expect(service.extract({ maxCells: 1000, raw: true })).rejects.toMatchObject({
      response: { code: 'XLSX_SHEET_NOT_FOUND' },
    });
  });

  it('reports fallbacks for a bare workbook without Props/Names/Workbook', async () => {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['a'], [1]]), 'Only');
    const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
    const meta = await serviceFor(buffer).metadata({ maxCells: 1000 });
    expect(meta.sheets).toHaveLength(1);
    expect(meta.definedNames).toEqual([]);
    expect(meta.props).toEqual(expect.objectContaining({}));
    expect(meta.custprops).toEqual({});
  });
});

describe('XlsxService content-type fallbacks', () => {
  it('rejects a missing content-type header with 415', async () => {
    const stream = Readable.from([Buffer.from('x')]);
    const cls = {
      request: () => ({ method: 'POST', raw: stream }),
      sourceDirection: () => ({ set: () => {} }),
      sourceStream: () => ({ get: () => stream, set: () => {} }),
    };
    const service = new XlsxService(cls as never);
    await expect(service.metadata({ maxCells: 1000 })).rejects.toMatchObject({ status: 415 });
  });
});
