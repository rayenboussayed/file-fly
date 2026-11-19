import { z } from 'zod';

import { trimmed } from '@/utils/zod.js';

/** One cell in a build payload: primitive or a SheetJS `CellObject`. */
const cellSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  // Pass-through of the SheetJS CellObject for formulas, formats and links.
  z
    .object({
      c: z.array(z.object({ a: z.string(), t: z.coerce.string() }).loose()).optional(),
      f: z.string().optional(),
      l: z
        .object({ Target: z.string().optional(), Tooltip: z.string().optional() })
        .loose()
        .optional(),
      t: z.enum(['b', 'n', 's', 'd', 'e', 'z']).optional(),
      v: z.unknown().optional(),
      z: z.string().optional(),
    })
    .loose(),
]);

const sheetSchema = z
  .object({
    /** Auto filter range, e.g. A1:C10. */
    autofilter: trimmed(
      // Linear regex (no nested quantifiers); range syntax is intentionally narrow.
      // eslint-disable-next-line security/detect-unsafe-regex
      z.string().regex(/^[A-Z]{1,3}\d+(?::[A-Z]{1,3}\d+)?$/i),
    ).optional(),
    /** Write Date cells (type `d`) instead of numeric serials when true. */
    cellDates: z.boolean().optional(),
    /** Column properties written to `!cols` (width wpx/wch, hidden, outline level). */
    cols: z
      .array(
        z
          .object({
            hidden: z.boolean().optional(),
            level: z.number().int().min(0).max(7).optional(),
            wch: z.number().min(0).max(2000).optional(),
            width: z.number().min(0).max(2000).optional(),
            wpx: z.number().min(0).max(100_000).optional(),
          })
          .loose(),
      )
      .max(16_384)
      .optional(),
    /** Object rows only: lock the column order (default: first-appearance order). */
    columns: z.array(z.string().min(1)).max(16_384).optional(),
    /** Merge ranges, e.g. A1:C2. */
    merges: z.array(
      trimmed(
        // Linear regex (no nested quantifiers); range syntax is intentionally narrow.
        // eslint-disable-next-line security/detect-unsafe-regex
        z.string().regex(/^[A-Z]{1,3}\d+(?::[A-Z]{1,3}\d+)?$/i),
      ),
    ).max(10_000).optional(),
    /** Sheet name (1-31 chars, Excel charset); duplicates auto-uniquify. `date1904` workbooks are refused on write (SheetJS serializes 1904-flagged Date cells with the 1900 epoch). */
    name: trimmed(
      z
        .string()
        .min(1)
        .max(31)
        // Excel charset, first char alphanumeric; never starts with '_' (no dunder/prototype keys).
        .regex(/^[A-Z0-9][^:\\/?*[\]]{0,30}$/i),
    ).optional(),
    /** Rows: objects map keys to cells; arrays emit positional cells. At least one row. */
    rows: z
      .array(z.union([z.record(z.string(), cellSchema), z.array(cellSchema)]))
      .min(1),
    /** 0 visible, 1 hidden, 2 very hidden. */
    sheetVisibility: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
  })
  .strict();
/** A sheet definition in the build payload. */
export type XlsxSheetType = z.infer<typeof sheetSchema>;

/** Body of `POST /xlsx/build`. */
export const XlsxBuildSchema = z
  .object({
    sheets: z.array(sheetSchema).min(1).max(256),
    workbook: z
      .object({
        /** Workbook-global defined names (`x` in expressions, scoped via `Sheet`). */
        Names: z
          .array(
            z
              .object({
                Name: z.string().min(1),
                Ref: z.string().min(1),
                Sheet: z.number().int().optional(),
              })
              .loose(),
          )
          .max(1000)
          .optional(),
        Props: z
          .object({
            Author: z.string().optional(),
            Category: z.string().optional(),
            Comments: z.string().optional(),
            Company: z.string().optional(),
            CreatedDate: z.coerce.date().optional(),
            Keywords: z.string().optional(),
            Manager: z.string().optional(),
            ModifiedBy: z.string().optional(),
            ModifiedDate: z.coerce.date().optional(),
            Subject: z.string().optional(),
            Title: z.string().optional(),
          })
          .loose()
          .optional(),
        WBProps: z
          .object({
            CodeName: z.string().optional(),
            date1904: z.boolean().optional(),
            filterPrivacy: z.boolean().optional(),
          })
          .loose()
          .optional(),
      })
      .loose()
      .optional(),
  })
  .strict();
/** Validated body for `POST /xlsx/build`. */
export type XlsxBuildType = z.infer<typeof XlsxBuildSchema>;

/**
 * Flat query parameters for `POST /xlsx/extract`.
 * The raw .xlsx travels in the body; everything here is a reader option.
 */
export const XlsxExtractSchema = z.object({
  blankrows: z.stringbool().optional(),
  dateNF: trimmed(z.string().min(1).max(64)).optional(),
  /** 1 = AOA rows, `A` = column-letter keys, or comma-separated custom headers. */
  header: trimmed(z.string().min(1).max(1000)).optional(),
  /** Reject packages whose worksheets carry more cells than this; bounds parse cost. */
  maxCells: z.coerce.number().int().min(1).max(20_000_000).default(2_000_000),
  raw: z.stringbool().default(true),
  /** Sheet name or 0-based index. */
  sheet: trimmed(z.string().min(1)).optional(),
  skipHidden: z.stringbool().optional(),
}).strict();
/** Flat query parameters for `POST /xlsx/extract`. */
export type XlsxExtractType = z.infer<typeof XlsxExtractSchema>;

/** Flat query parameters for `POST /xlsx/metadata`. */
export const XlsxMetadataSchema = z.object({
  /** Reject archives whose cells exceed this count (checked before SheetJS parses). */
  maxCells: z.coerce.number().int().min(1).max(20_000_000).default(2_000_000),
}).strict();
/** Flat query parameters for `POST /xlsx/metadata`. */
export type XlsxMetadataType = z.infer<typeof XlsxMetadataSchema>;
