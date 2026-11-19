import { z } from 'zod';

import { trimmed } from '@/utils/zod.js';

const hexColor = trimmed(z.string().regex(/^[0-9a-f]{6}$/i));

/** Only the plain OOXML word mime; templates, macros and other packages are rejected. */
export const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/** Flat query parameters for `POST /docx/extract` (empty; rejects junk params). */
export const DocxExtractSchema = z.object({}).strict();

/** Flat query parameters for `POST /docx/metadata` (empty; rejects junk params). */
export const DocxMetadataSchema = z.object({}).strict();
const points = z.number().min(0).max(2000);

/** A formatted text run; every TextRun option is mirrored here. */
const runSchema = z
  .object({
    allCaps: z.boolean().optional(),
    bold: z.boolean().optional(),
    break: z.number().int().min(1).max(100).optional(),
    color: hexColor.optional(),
    doubleStrike: z.boolean().optional(),
    /** Endnote id; renders an endnote reference at this position. */
    endnote: z.number().int().positive().optional(),
    /** Footnote id; renders a footnote reference at this position. */
    footnote: z.number().int().positive().optional(),
    highlight: z
      .enum(['black', 'blue', 'cyan', 'darkBlue', 'darkCyan', 'darkGray', 'darkGreen', 'darkMagenta', 'darkRed', 'darkYellow', 'green', 'lightGray', 'magenta', 'none', 'red', 'white', 'yellow'])
      .optional(),
    italics: z.boolean().optional(),
    language: z.string().max(20).optional(),
    smallCaps: z.boolean().optional(),
    strike: z.boolean().optional(),
    subScript: z.boolean().optional(),
    /** Superscript (mutually exclusive with subscript). */
    superScript: z.boolean().optional(),
    text: z.string().max(100_000),
    type: z.literal('run').optional(),
    underline: z
      .union([
        z.literal(true),
        z.object({
          color: hexColor.optional(),
          type: z.enum(['single', 'words', 'double', 'thick', 'dotted', 'dottedHeavy', 'dash', 'dashedHeavy', 'dashLong', 'dashLongHeavy', 'dotDash', 'dashDotHeavy', 'dotDotDash', 'dashDotDotHeavy', 'wave', 'wavyHeavy', 'wavyDouble', 'none']),
        }).strict(),
      ])
      .optional(),
    vanish: z.boolean().optional(),
  })
  .strict()
  .refine((run) => run.superScript !== true || run.subScript !== true, {
    message: 'superScript and subScript are mutually exclusive',
  });
/** A validated text run; mirrors the docx TextRun options. */
export type RunType = z.infer<typeof runSchema>;

const spacingSchema = z
  .object({
    /** Space before in points. */
    after: points.optional(),
    /** Space after in points. */
    before: points.optional(),
    /** Exact line rule (atLeast/exact exactly/auto). */
    line: points.optional(),
    lineRule: z.enum(['atLeast', 'exact', 'auto']).optional(),
  })
  .strict();

const indentSchema = z
  .object({
    firstLine: z.number().min(0).max(1000).optional(),
    hanging: z.number().min(0).max(1000).optional(),
    left: z.number().min(0).max(2000).optional(),
    right: z.number().min(0).max(2000).optional(),
  })
  .strict();

const shadingSchema = z
  .object({
    fill: hexColor,
    type: z.enum(['clear', 'solid', 'nil', 'pct5', 'pct10', 'pct25', 'pct50', 'horzStripe', 'vertStripe', 'diagStripe', 'diagCross', 'horzCross']).default('clear'),
  })
  .strict();

const tabStopSchema = z
  .object({
    alignment: z.enum(['left', 'right', 'center', 'decimal', 'bar']).default('left'),
    leader: z.enum(['none', 'dot', 'hyphen', 'underscore', 'middleDot']).default('none'),
    /** Position in twentieths of a point (same unit as Word tab positions). */
    position: z.number().min(0).max(32_000),
  })
  .strict();

const numberingRefSchema = z
  .object({ level: z.number().int().min(0).max(8), reference: trimmed(z.string().min(1).max(120)) })
  .strict();

const borderSchema = z
  .object({
    color: hexColor.optional(),
    /** Size in eighths of a point (Word sz). */
    size: z.number().int().min(0).max(96).optional(),
    style: z.enum(['single', 'double', 'dotted', 'dashed', 'none', 'thick', 'wave', 'dotDash']).default('single'),
  })
  .strict();

const tableBordersSchema = z
  .object({
    bottom: borderSchema.optional(),
    insideHorizontal: borderSchema.optional(),
    insideVertical: borderSchema.optional(),
    left: borderSchema.optional(),
    right: borderSchema.optional(),
    top: borderSchema.optional(),
  })
  .strict();

const cellElementSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('pageBreak'),
  }).strict(),
  z.object({
    type: z.literal('columnBreak'),
  }).strict(),
  z.object({
    type: z.literal('thematicBreak'),
  }).strict(),
  // paragraphSchema is defined above; reused here for cells (no nested tables allowed).
  z.lazy(() => paragraphSchema),
  z.lazy(() => imageSchema),
  z.lazy(() => hyperlinkSchema),
  z.lazy(() => bookmarkSchema),
  z.lazy(() => commentRefSchema),
]);

const tableCellSchema = z
  .object({
    children: z.array(cellElementSchema).max(200).optional(),
    colSpan: z.number().int().min(1).max(100).optional(),
    rowSpan: z.number().int().min(1).max(100).optional(),
    shading: shadingSchema.optional(),
    verticalAlign: z.enum(['top', 'center', 'bottom']).optional(),
    width: z.number().int().min(1).max(31_000).optional(),
  })
  .strict();

const tableSchema = z
  .object({
    borders: tableBordersSchema.optional(),
    /** Repeats the first row across pages. */
    headerRow: z.boolean().optional(),
    layout: z.enum(['autofit', 'fixed']).optional(),
    rows: z.array(z.array(tableCellSchema)).min(1).max(1000),
    type: z.literal('table'),
    width: z.number().int().min(1).max(31_680).optional(),
  })
  .strict();

const imageSchema = z
  .object({
    altText: z.string().max(500).optional(),
    /** Base64-encoded image bytes (no data URI prefix). */
    data: z.string().min(1).max(15 * 1024 * 1024).regex(/^[A-Z0-9+/]*={0,2}$/i, 'invalid base64'),
    /** Required for `imageType: 'svg'`; a raster fallback for processors that cannot draw SVG. */
    fallback: z
      .object({
        data: z.string().min(1).max(15 * 1024 * 1024).regex(/^[A-Z0-9+/]*={0,2}$/i, 'invalid base64'),
        imageType: z.enum(['png', 'jpg', 'gif', 'bmp']),
      })
      .strict()
      .optional(),
    height: z.number().int().min(1).max(4000),
    imageType: z.enum(['png', 'jpg', 'gif', 'bmp', 'svg']),
    type: z.literal('image'),
    width: z.number().int().min(1).max(4000),
  })
  .strict();

const hyperlinkSchema = z
  .object({
    /** Anchor of an in-document bookmark; wins over url when both set. */
    anchor: z.string().min(1).max(255).optional(),
    runs: z.array(runSchema).min(1),
    type: z.literal('hyperlink'),
    url: z.url().max(2048).optional(),
  })
  .strict();

const tocSchema = z
  .object({
    /** Heading depth to include (1-6). */
    levels: z.number().int().min(1).max(6).default(3),
    /** The alias (title) of the inserted table of contents. */
    title: z.string().min(1).max(200).default('Table of contents'),
    type: z.literal('toc'),
  })
  .strict();

const bookmarkSchema = z
  .object({
    children: z.array(runSchema).min(1),
    name: trimmed(z.string().min(1).max(255).regex(/^[\w.:-]+$/)),
    type: z.literal('bookmark'),
  })
  .strict();

const commentRefSchema = z
  .object({
    id: z.number().int().positive(),
    type: z.literal('commentRef'),
  })
  .strict();

const paragraphSchema = z
  .object({
    alignment: z.enum(['left', 'center', 'right', 'both']).optional(),
    heading: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6), z.literal('title')]).optional(),
    indent: indentSchema.optional(),
    keepLines: z.boolean().optional(),
    keepWithNext: z.boolean().optional(),
    numbering: numberingRefSchema.optional(),
    outlineLevel: z.number().int().min(0).max(9).optional(),
    pageBreakBefore: z.boolean().optional(),
    runs: z.array(runSchema).min(1),
    shading: shadingSchema.optional(),
    spacing: spacingSchema.optional(),
    tabStops: z.array(tabStopSchema).max(64).optional(),
    type: z.literal('paragraph'),
  })
  .strict();

const elementSchema = z.discriminatedUnion('type', [
  commentRefSchema,
  paragraphSchema,
  hyperlinkSchema,
  tableSchema,
  imageSchema,
  tocSchema,
  bookmarkSchema,
  z.object({ type: z.literal('pageBreak') }).strict(),
  z.object({ type: z.literal('columnBreak') }).strict(),
  z.object({ type: z.literal('thematicBreak') }).strict(),
]);
/** The discriminated union of all supported document-body elements. */
export type ElementType = z.infer<typeof elementSchema>;

const headerFooterSchema = z
  .union([z.array(elementSchema).min(1), z.literal('blank')])
  .optional();

const sectionSchema = z
  .object({
    children: z.array(elementSchema),
    footers: z
      .object({ default: headerFooterSchema, even: headerFooterSchema, first: headerFooterSchema })
      .strict()
      .optional(),
    headers: z
      .object({ default: headerFooterSchema, even: headerFooterSchema, first: headerFooterSchema })
      .strict()
      .optional(),
    properties: z
      .object({
        columns: z.union([z.number().int().min(1).max(40), z.object({ count: z.number().int().min(1).max(40), spacing: z.number().int().min(0).max(2000) }).strict()]).optional(),
        margins: z
          .object({
            bottom: z.number().int().min(0).max(2000).optional(),
            left: z.number().int().min(0).max(2000).optional(),
            right: z.number().int().min(0).max(2000).optional(),
            top: z.number().int().min(0).max(2000).optional(),
          })
          .strict()
          .optional(),
        orientation: z.enum(['portrait', 'landscape']).optional(),
        pageSize: z
          .object({ height: z.number().int().min(1440).max(20_160), width: z.number().int().min(1440).max(20_160) })
          .strict()
          .optional(),
        sectionType: z.enum(['continuous', 'nextColumn', 'nextPage', 'evenPage', 'oddPage']).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const metadataSchema = z
  .object({
    category: z.string().max(300).optional(),
    creator: z.string().max(300).optional(),
    description: z.string().max(2000).optional(),
    keywords: z.string().max(2000).optional(),
    lastModifiedBy: z.string().max(300).optional(),
    revision: z.number().int().min(0).optional(),
    subject: z.string().max(500).optional(),
    title: z.string().max(500).optional(),
  })
  .strict();

const numberingSchema = z
  .object({
    levels: z.array(
      z
        .object({
          alignment: z.enum(['left', 'center', 'right']).optional(),
          format: z.enum(['decimal', 'upperRoman', 'lowerRoman', 'upperLetter', 'lowerLetter', 'bullet', 'none']).default('decimal'),
          level: z.number().int().min(0).max(8),
          start: z.number().int().min(0).max(10_000).optional(),
          text: z.string().max(50).optional(),
        })
        .strict(),
    ).min(1).max(9),
    reference: trimmed(z.string().min(1).max(120)),
  })
  .strict();

const noteSchema = z
  .object({
    children: z.array(paragraphSchema).min(1),
    id: z.number().int().positive(),
  })
  .strict();

const commentSchema = z
  .object({
    author: z.string().min(1).max(300),
    children: z.array(paragraphSchema).min(1),
    date: z.coerce.date().optional(),
    id: z.number().int().positive(),
    initials: z.string().max(20).optional(),
  })
  .strict();

/** Body of `POST /docx/build`. */
export const DocxBuildSchema = z
  .object({
    /** Comments; each is appended at the end of the document with an id reference. */
    comments: z.array(commentSchema).max(100).optional(),
    /** Endnote definitions keyed by the ids referenced from runs. */
    endnotes: z.array(noteSchema).max(100).optional(),
    /** Footnote definitions keyed by the ids referenced from runs. */
    footnotes: z.array(noteSchema).max(100).optional(),
    metadata: metadataSchema.optional(),
    /** Numbering definitions referenced from paragraph elements. */
    numbering: z.array(numberingSchema).max(100).optional(),
    sections: z.array(sectionSchema).min(1).max(100),
  })
  .strict();
/** Validated `POST /docx/build` payload. */
export type DocxBuildType = z.infer<typeof DocxBuildSchema>;


