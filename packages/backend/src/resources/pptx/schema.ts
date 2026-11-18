import { z } from 'zod';

import { trimmed } from '@/utils/zod.js';

/** Only the plain OOXML presentation mime; templates, macros and other packages are rejected. */
export const PPTX_MIME =
  'application/vnd.openxmlformats-officedocument.presentationml.presentation';

const hexColor = trimmed(z.string().regex(/^[0-9a-f]{6}$/i));
/**
 * Strings interpolated raw into the generated XML (fonts, company, revision...). Single quote is safe inside double-quoted attributes.
 * @param max
 */
/**
 * Strings interpolated raw into the generated XML (fonts, company, revision...).
 * Single quote is safe inside double-quoted attributes.
 * @param max - Maximum length of the string.
 * @returns A trimmed zod string schema rejecting XML-significant characters.
 */
const xmlSafe = (max: number) => z.string().trim().max(max).regex(/^[^<>&"]*$/, 'invalid characters for XML');
const inches = z.number().min(0).max(56);
const positiveInches = z.number().min(0.01).max(56);

/** A hyperlink attached to a text run. */
const hyperlinkSchema = z
  .object({
    slide: z.number().int().min(1).optional(),
    url: z.url().max(2048).optional(),
  })
  .strict()
  .refine((value) => (value.url !== undefined) !== (value.slide !== undefined), {
    message: 'a hyperlink needs exactly one of url or slide',
  });

/** A text run; every run-level pptxgenjs option is mirrored here. */
const runSchema = z
  .object({
    bold: z.boolean().optional(),
    breakLine: z.boolean().optional(),
    bullet: z.union([z.boolean(), z.object({ code: z.string().regex(/^[0-9A-F]{4}$/i, 'hex character code').optional() }).strict()]).optional(),
    color: hexColor.optional(),
    fontFace: xmlSafe(100).optional(),
    fontSize: z.number().min(1).max(400).optional(),
    highlight: hexColor.optional(),
    hyperlink: hyperlinkSchema.optional(),
    indentLevel: z.number().int().min(0).max(8).optional(),
    italic: z.boolean().optional(),
    lang: xmlSafe(20).optional(),
    strike: z.boolean().optional(),
    subScript: z.boolean().optional(),
    superScript: z.boolean().optional(),
    text: z.string().max(50_000),
    underline: z.boolean().optional(),
  })
  .strict();
export type RunType = z.infer<typeof runSchema>;

const baseElementSchema = z.object({
  h: positiveInches,
  w: positiveInches,
  x: inches,
  y: inches,
});

/** A text box with one or more runs. */
const textSchema = baseElementSchema.extend({
  align: z.enum(['left', 'center', 'right', 'justify']).optional(),
  bullet: z.union([z.boolean(), z.object({ code: z.string().min(1).max(4).optional() }).strict()]).optional(),
  fill: z.object({ color: hexColor }).strict().optional(),
  fit: z.enum(['none', 'shrink', 'resize']).optional(),
  indentLevel: z.number().int().min(0).max(8).optional(),
  line: z.object({ color: hexColor, width: z.number().min(0).max(20).optional() }).strict().optional(),
  /** Spacing in points (spcPts). */
  lineSpacing: z.number().min(1).max(400).optional(),
  margin: z.number().min(0).max(200).optional(),
  rotation: z.number().min(0).max(360).optional(),
  rtl: z.boolean().optional(),
  runs: z.array(runSchema).min(1).max(1000),
  type: z.literal('text'),
  valign: z.enum(['top', 'middle', 'bottom']).optional(),
});

const SHAPES = [
  'accentBorderCallout1',
  'accentBorderCallout2',
  'accentBorderCallout3',
  'accentCallout1',
  'accentCallout2',
  'accentCallout3',
  'actionButtonBackPrevious',
  'actionButtonBeginning',
  'actionButtonBlank',
  'actionButtonDocument',
  'actionButtonEnd',
  'actionButtonForwardNext',
  'actionButtonHelp',
  'actionButtonHome',
  'actionButtonInformation',
  'actionButtonMovie',
  'actionButtonReturn',
  'actionButtonSound',
  'arc',
  'bentArrow',
  'bentUpArrow',
  'bevel',
  'blockArc',
  'borderCallout1',
  'borderCallout2',
  'borderCallout3',
  'bracePair',
  'bracketPair',
  'callout1',
  'callout2',
  'callout3',
  'can',
  'chartPlus',
  'chartStar',
  'chartX',
  'chevron',
  'chord',
  'circularArrow',
  'cloud',
  'cloudCallout',
  'corner',
  'cornerTabs',
  'cube',
  'curvedDownArrow',
  'curvedLeftArrow',
  'curvedRightArrow',
  'curvedUpArrow',
  'custGeom',
  'decagon',
  'diagStripe',
  'diamond',
  'dodecagon',
  'donut',
  'doubleWave',
  'downArrow',
  'downArrowCallout',
  'ellipse',
  'ellipseRibbon',
  'ellipseRibbon2',
  'flowChartAlternateProcess',
  'flowChartCollate',
  'flowChartConnector',
  'flowChartDecision',
  'flowChartDelay',
  'flowChartDisplay',
  'flowChartDocument',
  'flowChartExtract',
  'flowChartInputOutput',
  'flowChartInternalStorage',
  'flowChartMagneticDisk',
  'flowChartMagneticDrum',
  'flowChartMagneticTape',
  'flowChartManualInput',
  'flowChartManualOperation',
  'flowChartMerge',
  'flowChartMultidocument',
  'flowChartOfflineStorage',
  'flowChartOffpageConnector',
  'flowChartOnlineStorage',
  'flowChartOr',
  'flowChartPredefinedProcess',
  'flowChartPreparation',
  'flowChartProcess',
  'flowChartPunchedCard',
  'flowChartPunchedTape',
  'flowChartSort',
  'flowChartSummingJunction',
  'flowChartTerminator',
  'folderCorner',
  'frame',
  'funnel',
  'gear6',
  'gear9',
  'halfFrame',
  'heart',
  'heptagon',
  'hexagon',
  'homePlate',
  'horizontalScroll',
  'irregularSeal1',
  'irregularSeal2',
  'leftArrow',
  'leftArrowCallout',
  'leftBrace',
  'leftBracket',
  'leftCircularArrow',
  'leftRightArrow',
  'leftRightArrowCallout',
  'leftRightCircularArrow',
  'leftRightRibbon',
  'leftRightUpArrow',
  'leftUpArrow',
  'lightningBolt',
  'line',
  'lineInv',
  'mathDivide',
  'mathEqual',
  'mathMinus',
  'mathMultiply',
  'mathNotEqual',
  'mathPlus',
  'moon',
  'noSmoking',
  'nonIsoscelesTrapezoid',
  'notchedRightArrow',
  'octagon',
  'parallelogram',
  'pentagon',
  'pie',
  'pieWedge',
  'plaque',
  'plaqueTabs',
  'plus',
  'quadArrow',
  'quadArrowCallout',
  'rect',
  'ribbon',
  'ribbon2',
  'rightArrow',
  'rightArrowCallout',
  'rightBrace',
  'rightBracket',
  'round1Rect',
  'round2DiagRect',
  'round2SameRect',
  'roundRect',
  'rtTriangle',
  'smileyFace',
  'snip1Rect',
  'snip2DiagRect',
  'snip2SameRect',
  'snipRoundRect',
  'squareTabs',
  'star10',
  'star12',
  'star16',
  'star24',
  'star32',
  'star4',
  'star5',
  'star6',
  'star7',
  'star8',
  'stripedRightArrow',
  'sun',
  'swooshArrow',
  'teardrop',
  'trapezoid',
  'triangle',
  'upArrow',
  'upArrowCallout',
  'upDownArrow',
  'upDownArrowCallout',
  'uturnArrow',
  'verticalScroll',
  'wave',
  'wedgeEllipseCallout',
  'wedgeRectCallout',
  'wedgeRoundRectCallout',
] as const;

/** A shape, optionally with caption text. */
const shapeSchema = baseElementSchema.extend({
  fill: z.object({ color: hexColor }).strict().optional(),
  line: z
    .object({ color: hexColor, width: z.number().min(0).max(20).optional() })
    .strict()
    .optional(),
  rotation: z.number().min(0).max(360).optional(),
  shape: z.enum(SHAPES),
  text: z.array(runSchema).optional(),
  type: z.literal('shape'),
});

const tableCellSchema = z
  .object({
    colSpan: z.number().int().min(1).max(100).optional(),
    fill: z.object({ color: hexColor }).strict().optional(),
    options: z
      .object({
        colspan: z.number().int().min(1).max(100).optional(),
        fill: z.object({ color: hexColor }).strict().optional(),
        margin: z.number().min(0).max(100).optional(),
        rowspan: z.number().int().min(1).max(100).optional(),
        valign: z.enum(['top', 'middle', 'bottom']).optional(),
      })
      .strict()
      .optional(),
    rowSpan: z.number().int().min(1).max(100).optional(),
    text: z.string().max(50_000),
  })
  .strict();

/** A table with rows of cells. */
const tableSchema = baseElementSchema.extend({
  margin: z.number().min(0).max(100).optional(),
  rows: z.array(z.array(tableCellSchema).min(1).max(200)).min(1).max(500),
  type: z.literal('table'),
});

/** A base64-embedded image. */
const imageSchema = baseElementSchema.extend({
  altText: z.string().max(500).optional(),
  /** Base64-encoded image bytes (no data URI prefix). */
  data: z.string().min(1).max(15 * 1024 * 1024).regex(/^[A-Z0-9+/]*={0,2}$/i, 'invalid base64'),
  imageType: z.enum(['png', 'jpg', 'gif', 'bmp']),
  sizing: z
    .object({
      h: positiveInches,
      type: z.enum(['contain', 'cover', 'crop']),
      w: positiveInches,
    })
    .strict()
    .optional(),
  transparency: z.number().int().min(0).max(100).optional(),
  type: z.literal('image'),
});

const chartSeriesSchema = z
  .object({
    labels: z.array(z.string().max(500)).min(1).max(1000),
    name: z.string().max(200).optional(),
    values: z.array(z.number()).min(1).max(1000),
  })
  .strict();

/** A chart with one or more series. */
const chartSchema = baseElementSchema.extend({
  chartColors: z.array(hexColor).max(32).optional(),
  chartType: z.enum(['bar', 'bar3d', 'line', 'pie', 'doughnut', 'area', 'scatter', 'radar']),
  series: z.array(chartSeriesSchema).min(1).max(50),
  showLegend: z.boolean().optional(),
  showValue: z.boolean().optional(),
  title: xmlSafe(500).optional(),
  type: z.literal('chart'),
}).refine((chart) => chart.chartType !== 'scatter' || chart.series.length >= 2, {
  message: 'scatter charts need at least two series (X and Y)',
});

const elementSchema = z.discriminatedUnion('type', [
  textSchema,
  shapeSchema,
  tableSchema,
  imageSchema,
  chartSchema,
]);
export type ElementType = z.infer<typeof elementSchema>;

const backgroundSchema = z
  .object({
    color: hexColor,
  })
  .strict();

const slideSchema = z
  .object({
    background: backgroundSchema.optional(),
    elements: z.array(elementSchema).max(500),
    /** Speaker notes; plain text with newlines. */
    notes: z.string().max(20_000).optional(),
  })
  .strict();

const metadataSchema = z
  .object({
    author: xmlSafe(300).optional(),
    company: xmlSafe(300).optional(),
    revision: z.string().trim().regex(/^\d{1,10}$/, 'revision must be an integer').optional(),
    subject: xmlSafe(500).optional(),
    title: xmlSafe(500).optional(),
  })
  .strict();

/** Body of `POST /pptx/build`. */
export const PptxBuildSchema = z
  .object({
    /** Built-in or `wide`/`square`; a custom layout via `defineLayout` is a future extension. */
    layout: z.enum(['LAYOUT_16x9', 'LAYOUT_16x10', 'LAYOUT_4x3', 'LAYOUT_WIDE']).default('LAYOUT_16x9'),
    metadata: metadataSchema.optional(),
    slides: z.array(slideSchema).min(1).max(500),
    theme: z
      .object({
        bodyFontFace: xmlSafe(100).optional(),
        headFontFace: xmlSafe(100).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type PptxBuildType = z.infer<typeof PptxBuildSchema>;

/** Flat query parameters for `POST /pptx/extract` (empty; rejects junk params). */
export const PptxExtractSchema = z.object({}).strict();

/** Flat query parameters for `POST /pptx/metadata` (empty; rejects junk params). */
export const PptxMetadataSchema = z.object({}).strict();
