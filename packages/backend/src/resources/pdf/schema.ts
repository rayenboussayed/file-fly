import { z } from 'zod';

import { EmptyQuerySchema, trimmed } from '@/utils/zod.js';

/** Only the plain PDF mime. */
export const PDF_MIME = 'application/pdf';

const hexColor = trimmed(z.string().regex(/^[0-9a-f]{6}$/i));
const points = z.number().min(0).max(10_000);
const base64 = z.string().min(1).max(15 * 1024 * 1024).regex(/^[A-Z0-9+/]*={0,2}$/i, 'invalid base64');

const STANDARD_FONTS = [
  'Courier',
  'Courier-Bold',
  'Courier-Oblique',
  'Courier-BoldOblique',
  'Helvetica',
  'Helvetica-Bold',
  'Helvetica-Oblique',
  'Helvetica-BoldOblique',
  'Times-Roman',
  'Times-Bold',
  'Times-Italic',
  'Times-BoldItalic',
  'Symbol',
  'ZapfDingbats',
] as const;

const fontName = trimmed(z.string().min(1).max(100).regex(/^[\w-]+$/));

const fontSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine((value) => (STANDARD_FONTS as readonly string[]).includes(value) || fontName.safeParse(value).success, {
    message: 'font must be a standard PDF font name or a referenced embedded font',
  });

const textSchema = z
  .object({
    align: z.enum(['left', 'center', 'right']).optional(),
    color: hexColor.optional(),
    font: fontSchema.optional(),
    size: z.number().min(1).max(400).optional(),
    text: z.string().max(200_000),
    type: z.literal('text'),
    /** Box width in points; required when `align` is not `left` (text wraps to it). */
    w: z.number().min(1).max(10_000).optional(),
    x: points,
    y: points,
  })
  .strict()
  .refine((value) => value.align === undefined || value.align === 'left' || value.w !== undefined, {
    message: 'align center/right requires w',
  });

const rectSchema = z
  .object({
    /** Dashed outline. */
    dash: z.boolean().optional(),
    fill: hexColor.optional(),
    h: z.number().min(0).max(10_000),
    stroke: hexColor.optional(),
    strokeWidth: z.number().min(0).max(100).optional(),
    type: z.literal('rect'),
    w: z.number().min(0).max(10_000),
    x: points,
    y: points,
  })
  .strict();

const ellipseSchema = z
  .object({
    fill: hexColor.optional(),
    h: z.number().min(0).max(10_000),
    stroke: hexColor.optional(),
    strokeWidth: z.number().min(0).max(100).optional(),
    type: z.literal('ellipse'),
    w: z.number().min(0).max(10_000),
    x: points,
    y: points,
  })
  .strict();

const lineSchema = z
  .object({
    color: hexColor.optional(),
    /** Dashed line. */
    dash: z.boolean().optional(),
    thickness: z.number().min(0).max(100).optional(),
    type: z.literal('line'),
    x1: points,
    x2: points,
    y1: points,
    y2: points,
  })
  .strict();

const imageSchema = z
  .object({
    data: base64,
    h: z.number().min(1).max(10_000),
    imageType: z.enum(['png', 'jpg']),
    opacity: z.number().min(0).max(1).optional(),
    type: z.literal('image'),
    w: z.number().min(1).max(10_000),
    x: points,
    y: points,
  })
  .strict();

const fieldSchema = z
  .object({
    fieldType: z.enum(['text', 'checkbox']),
    h: z.number().min(1).max(10_000).optional(),
    /** Field name (AcroForm identifier). */
    name: trimmed(z.string().min(1).max(200).regex(/^[\w. -]+$/)),
    type: z.literal('field'),
    /** Default value; checkbox: "true" checks it. */
    value: z.string().max(10_000).optional(),
    w: z.number().min(1).max(10_000).optional(),
    x: points,
    y: points,
  })
  .strict();

const pageNumberSchema = z
  .object({
    color: hexColor.optional(),
    font: fontSchema.optional(),
    /** `{n}` placeholder; `{total}` resolves to the last page number. No newlines. */
    format: z.string().max(50).regex(/^[^\r\n]*$/, 'format must be a single line').default('{n}'),
    size: z.number().min(1).max(400).optional(),
    type: z.literal('pageNumber'),
    x: points,
    y: points,
  })
  .strict();

const tableCellSchema = z.union([
  z.string().max(50_000),
  z
    .object({
      align: z.enum(['left', 'center', 'right']).optional(),
      colSpan: z.number().int().min(1).max(100).optional(),
      fill: hexColor.optional(),
      /** Cell font size. */
      size: z.number().min(1).max(400).optional(),
      text: z.string().max(50_000),
    })
    .strict(),
]);

const tableSchema = z
  .object({
    /** Column widths in points; omit for equal-width columns. Must match the column count. */
    colWidths: z.array(z.number().min(1).max(10_000)).max(100).optional(),
    /** Treat the first row as a header (bold, shaded). */
    header: z.boolean().optional(),
    rows: z.array(z.array(tableCellSchema).min(1).max(100)).min(1).max(500),
    type: z.literal('table'),
    /** Content does not paginate; a table taller than the page is clipped off-page. */
    w: z.number().min(1).max(10_000),
    x: points,
    y: points,
  })
  .strict()
  .superRefine((table, ctx) => {
    if (table.colWidths === undefined) return;
    const columns = table.rows.reduce(
      (max, row) =>
        Math.max(
          max,
          row.reduce((sum, cell) => sum + (typeof cell === 'string' ? 1 : (cell.colSpan ?? 1)), 0),
        ),
      0,
    );
    if (table.colWidths.length !== columns) {
      ctx.addIssue({
        code: 'custom',
        message: `colWidths has ${table.colWidths.length} entries but the table needs ${columns} columns`,
      });
    }
  });

const elementSchema = z.discriminatedUnion('type', [
  textSchema,
  rectSchema,
  ellipseSchema,
  lineSchema,
  imageSchema,
  tableSchema,
  fieldSchema,
  pageNumberSchema,
  z.object({ type: z.literal('pageBreak') }).strict(),
]);
/** A single page element in the build payload. */
export type ElementType = z.infer<typeof elementSchema>;
/** A table cell in the build payload. */
export type TableCellType = z.infer<typeof tableCellSchema>;

const pageSchema = z
  .object({
    elements: z.array(elementSchema).max(1000),
    /** Page margins in points (72 = 1 inch). */
    margin: z
      .object({
        bottom: z.number().min(0).max(2000).default(72),
        left: z.number().min(0).max(2000).default(72),
        right: z.number().min(0).max(2000).default(72),
        top: z.number().min(0).max(2000).default(72),
      })
      .strict()
      .default({ bottom: 72, left: 72, right: 72, top: 72 }),
    orientation: z.enum(['portrait', 'landscape']).default('portrait'),
    size: z.enum(['a4', 'a3', 'a5', 'letter', 'legal', 'tabloid']).default('a4'),
  })
  .strict();

const metadataSchema = z
  .object({
    author: z.string().max(300).optional(),
    /** ISO-8601 timestamp; pdf-lib keeps it (CreationDate only set when absent). */
    creationDate: z.iso.datetime().optional(),
    creator: z.string().max(300).optional(),
    /** Comma-separated keywords or an array; written as PDF keywords. */
    keywords: z.union([z.string().max(2000), z.array(z.string().min(1)).max(100)]).optional(),
    language: z.string().max(20).optional(),
    subject: z.string().max(500).optional(),
    title: z.string().max(500).optional(),
  })
  .strict();

const embeddedFontSchema = z
  .object({
    /** Base64-encoded TTF/OTF bytes. */
    data: base64,
    /** Name referenced by `font` in elements. */
    name: fontName,
  })
  .strict();

/** Body of `POST /pdf/build`. */
export const PdfBuildSchema = z
  .object({
    /** Embedded TTF/OTF fonts, referenced by elements via `font`. WinAnsi preflight is skipped for these. */
    embeddedFonts: z.array(embeddedFontSchema).max(10).optional(),
    metadata: metadataSchema.optional(),
    pages: z.array(pageSchema).min(1).max(200),
  })
  .strict()
  .superRefine((body, ctx) => {
    const names = new Set<string>();
    for (const page of body.pages) {
      for (const element of page.elements) {
        if (element.type !== 'field') continue;
        if (names.has(element.name)) {
          ctx.addIssue({ code: 'custom', message: `duplicate field name "${element.name}"` });
          return;
        }
        names.add(element.name);
      }
    }
  });
/** Validated body for `POST /pdf/build`. */
export type PdfBuildType = z.infer<typeof PdfBuildSchema>;
/** A page in the build payload. */
export type PdfPageType = z.infer<typeof pageSchema>;

/** Flat query parameters for `POST /pdf/extract` (empty; rejects junk params). */
export const PdfExtractSchema = EmptyQuerySchema;
/** Flat query parameters for `POST /pdf/metadata` (empty; rejects junk params). */
export const PdfMetadataSchema = EmptyQuerySchema;
