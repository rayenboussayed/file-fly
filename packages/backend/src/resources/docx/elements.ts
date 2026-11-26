import type { ParagraphChild } from 'docx';

import {
  AlignmentType,
  Bookmark,
  BorderStyle,
  ColumnBreak,
  CommentRangeEnd,
  CommentRangeStart,
  CommentReference,
  EndnoteReferenceRun,
  ExternalHyperlink,
  FootnoteReferenceRun,
  HeadingLevel,
  ImageRun,
  InternalHyperlink,
  LeaderType,
  LineRuleType,
  PageBreak,
  PageOrientation,
  Paragraph,
  SectionType,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableOfContents,
  TableRow,
  TabStopType,
  TextRun,
  UnderlineType,
  VerticalAlignTable,
  WidthType,
} from 'docx';

import type { ElementType, RunType } from './schema.js';

const POINTS = 20; // twentieths of a point per point

const ALIGNMENT: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  both: AlignmentType.BOTH,
  center: AlignmentType.CENTER,
  left: AlignmentType.LEFT,
  right: AlignmentType.RIGHT,
} as const;

const HEADING: Record<string, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
  title: HeadingLevel.TITLE,
} as const;

const UNDERLINE: Record<string, (typeof UnderlineType)[keyof typeof UnderlineType]> = {
  dash: UnderlineType.DASH,
  dashDotDotHeavy: UnderlineType.DASHDOTDOTHEAVY,
  dashDotHeavy: UnderlineType.DASHDOTHEAVY,
  dashedHeavy: UnderlineType.DASHEDHEAVY,
  dashLong: UnderlineType.DASHLONG,
  dashLongHeavy: UnderlineType.DASHLONGHEAVY,
  dotDash: UnderlineType.DOTDASH,
  dotDotDash: UnderlineType.DOTDOTDASH,
  dotted: UnderlineType.DOTTED,
  dottedHeavy: UnderlineType.DOTTEDHEAVY,
  double: UnderlineType.DOUBLE,
  none: UnderlineType.NONE,
  single: UnderlineType.SINGLE,
  thick: UnderlineType.THICK,
  wave: UnderlineType.WAVE,
  wavyDouble: UnderlineType.WAVYDOUBLE,
  wavyHeavy: UnderlineType.WAVYHEAVY,
  words: UnderlineType.WORDS,
} as const;

const LEADER: Record<string, (typeof LeaderType)[keyof typeof LeaderType] | undefined> = {
  dot: LeaderType.DOT,
  hyphen: LeaderType.HYPHEN,
  middleDot: LeaderType.MIDDLE_DOT,
  none: undefined,
  underscore: LeaderType.UNDERSCORE,
} as const;

const VERTICAL_ALIGN: Record<string, (typeof VerticalAlignTable)[keyof typeof VerticalAlignTable]> = {
  bottom: VerticalAlignTable.BOTTOM,
  center: VerticalAlignTable.CENTER,
  top: VerticalAlignTable.TOP,
} as const;

const SECTION_TYPE: Record<string, (typeof SectionType)[keyof typeof SectionType]> = {
  continuous: SectionType.CONTINUOUS,
  evenPage: SectionType.EVEN_PAGE,
  nextColumn: SectionType.NEXT_COLUMN,
  nextPage: SectionType.NEXT_PAGE,
  oddPage: SectionType.ODD_PAGE,
} as const;

const BORDER_STYLE: Record<string, (typeof BorderStyle)[keyof typeof BorderStyle]> = {
  dashed: BorderStyle.DASHED,
  dotDash: BorderStyle.DOT_DASH,
  dotted: BorderStyle.DOTTED,
  double: BorderStyle.DOUBLE,
  none: BorderStyle.NONE,
  single: BorderStyle.SINGLE,
  thick: BorderStyle.THICK,
  wave: BorderStyle.WAVE,
};

/**
 * Builds one TextRun-like component from a run descriptor.
 * @param run - The run descriptor.
 * @returns The built run (text, footnote or endnote reference).
 */
const buildRun = (
  run: RunType,
): EndnoteReferenceRun | FootnoteReferenceRun | TextRun => {
  if (run.footnote !== undefined) return new FootnoteReferenceRun(run.footnote);
  if (run.endnote !== undefined) return new EndnoteReferenceRun(run.endnote);
  return new TextRun({
    allCaps: run.allCaps,
    bold: run.bold,
    break: run.break,
    color: run.color,
    doubleStrike: run.doubleStrike,
    highlight: run.highlight,
    italics: run.italics,
    language: run.language ? { value: run.language } : undefined,
    smallCaps: run.smallCaps,
    strike: run.strike,
    subScript: run.subScript,
    superScript: run.superScript,
    text: run.text,
    underline: buildUnderline(run.underline),
    vanish: run.vanish,
  });
};

const buildUnderline = (underline: RunType['underline']) => {
  if (underline === true) return { type: UnderlineType.SINGLE };
  if (underline) return { color: underline.color, type: UNDERLINE[underline.type] };
};

const LINE_RULE: Record<string, (typeof LineRuleType)[keyof typeof LineRuleType]> = {
  atLeast: LineRuleType.AT_LEAST,
  auto: LineRuleType.AUTO,
  exact: LineRuleType.EXACT,
};

const buildRunChildren = (runs: RunType[]) => runs.map((run) => buildRun(run));

const buildImageRun = (img: Extract<ElementType, { type: 'image' }>) => {
  if (img.imageType === 'svg') {
    if (!img.fallback) {
      throw new Error('svg images require a fallback raster');
    }
    return new ImageRun({
      altText: img.altText ? { description: img.altText } : undefined,
      data: Buffer.from(img.data, 'base64'),
      fallback: { data: Buffer.from(img.fallback.data, 'base64'), type: img.fallback.imageType },
      transformation: { height: img.height, width: img.width },
      type: 'svg',
    });
  }
  return new ImageRun({
    altText: img.altText ? { description: img.altText } : undefined,
    data: Buffer.from(img.data, 'base64'),
    transformation: { height: img.height, width: img.width },
    type: img.imageType,
  });
};

const SHADING = {
  clear: ShadingType.CLEAR,
  diagCross: ShadingType.DIAGONAL_CROSS,
  diagStripe: ShadingType.DIAGONAL_STRIPE,
  horzCross: ShadingType.HORIZONTAL_CROSS,
  horzStripe: ShadingType.HORIZONTAL_STRIPE,
  nil: ShadingType.NIL,
  pct5: ShadingType.PERCENT_5,
  pct10: ShadingType.PERCENT_10,
  pct25: ShadingType.PERCENT_25,
  pct50: ShadingType.PERCENT_50,
  solid: ShadingType.SOLID,
  vertStripe: ShadingType.VERTICAL_STRIPE,
} as const satisfies Record<string, (typeof ShadingType)[keyof typeof ShadingType]>;

const buildShading = (shading: { fill: string; type: string }) => ({
  fill: shading.fill,
  type: SHADING[shading.type as keyof typeof SHADING] ?? ShadingType.CLEAR,
});

const buildTabStops = (
  tabStops: Array<{ alignment: string; leader: string; position: number }>,
) =>
  tabStops.map((tab) => ({
    leader: LEADER[tab.leader as keyof typeof LEADER],
    position: tab.position,
    type: TabStopType[tab.alignment.toUpperCase() as keyof typeof TabStopType] ?? TabStopType.LEFT,
  }));

const buildIndent = (indent: NonNullable<Extract<ElementType, { type: 'paragraph' }>['indent']>) => ({
  firstLine: indent.firstLine === undefined ? undefined : indent.firstLine * POINTS,
  hanging: indent.hanging === undefined ? undefined : indent.hanging * POINTS,
  left: indent.left === undefined ? undefined : indent.left * POINTS,
  right: indent.right === undefined ? undefined : indent.right * POINTS,
});

const buildSpacing = (spacing: NonNullable<Extract<ElementType, { type: 'paragraph' }>['spacing']>) => ({
  after: spacing.after === undefined ? undefined : spacing.after * POINTS,
  before: spacing.before === undefined ? undefined : spacing.before * POINTS,
  line: spacing.line === undefined ? undefined : spacing.line * POINTS,
  lineRule: LINE_RULE[spacing.lineRule ?? 'auto'] ?? LineRuleType.AUTO,
});

const buildParagraph = (p: Extract<ElementType, { type: 'paragraph' }>): Paragraph =>
  new Paragraph({
    alignment: p.alignment ? ALIGNMENT[p.alignment] : undefined,
    children: buildRunChildren(p.runs),
    heading: p.heading === undefined ? undefined : HEADING[p.heading],
    indent: p.indent ? buildIndent(p.indent) : undefined,
    keepLines: p.keepLines,
    keepNext: p.keepWithNext,
    numbering: p.numbering ? { level: p.numbering.level, reference: p.numbering.reference } : undefined,
    outlineLevel: p.outlineLevel,
    pageBreakBefore: p.pageBreakBefore,
    shading: p.shading ? buildShading(p.shading) : undefined,
    spacing: p.spacing ? buildSpacing(p.spacing) : undefined,
    tabStops: p.tabStops ? buildTabStops(p.tabStops) : undefined,
  });

const buildBorder = (border: { color?: string; size?: number; style: string }) => ({
  color: border.color,
  size: border.size,
  style: BORDER_STYLE[border.style] ?? BorderStyle.SINGLE,
});

/**
Block-level elements buildBlock delegates to buildInline — the inline subset only.
 */
type InlineElementType = Extract<ElementType, { type: 'bookmark' | 'commentRef' | 'hyperlink' | 'image' }>;

const buildInline = (element: InlineElementType): ParagraphChild[] => {
  switch (element.type) {
    case 'bookmark': {
      return [new Bookmark({ children: buildRunChildren(element.children), id: element.name })];
    }
    case 'commentRef': {
      return [new CommentRangeStart(element.id), new CommentRangeEnd(element.id), new CommentReference(element.id)];
    }
    case 'hyperlink': {
      if (element.anchor) {
        return [
          new InternalHyperlink({ anchor: element.anchor, children: buildRunChildren(element.runs) }),
        ];
      }
      if (element.url === undefined) {
        // Guaranteed by the payload validation in DocxService.build; belt and braces.
        throw new Error('hyperlink requires a url or an anchor');
      }
      return [new ExternalHyperlink({ children: buildRunChildren(element.runs), link: element.url })];
    }
    case 'image': {
      return [buildImageRun(element)];
    }
  }
};

/**
 * Block-level elements accepted as children of a section, cell, header or footer.
 * @param element - The element descriptor.
 * @returns The built docx components.
 */
export const buildBlock = (
  element: ElementType,
): Array<Paragraph | Table | TableOfContents> => {
  switch (element.type) {
    case 'bookmark':
    case 'commentRef':
    case 'hyperlink': {
      return [new Paragraph({ children: buildInline(element) })];
    }
    case 'columnBreak': {
      return [new Paragraph({ children: [new ColumnBreak()] })];
    }
    case 'image': {
      return [new Paragraph({ children: buildInline(element) })];
    }
    case 'pageBreak': {
      return [new Paragraph({ children: [new PageBreak()] })];
    }
    case 'paragraph': {
      return [buildParagraph(element)];
    }
    case 'table': {
      return [buildTable(element)];
    }
    case 'thematicBreak': {
      return [new Paragraph({ children: [], thematicBreak: true })];
    }
    case 'toc': {
      return [
        new TableOfContents(element.title ?? 'Table of contents', {
          headingStyleRange: `1-${element.levels}`,
          hyperlink: true,
        }),
      ];
    }
    default: {
      return [];
    }
  }
};

const buildTable = (table: Extract<ElementType, { type: 'table' }>): Table =>
  new Table({
    borders: table.borders
      ? {
          bottom: table.borders.bottom ? buildBorder(table.borders.bottom) : undefined,
          insideHorizontal: table.borders.insideHorizontal ? buildBorder(table.borders.insideHorizontal) : undefined,
          insideVertical: table.borders.insideVertical ? buildBorder(table.borders.insideVertical) : undefined,
          left: table.borders.left ? buildBorder(table.borders.left) : undefined,
          right: table.borders.right ? buildBorder(table.borders.right) : undefined,
          top: table.borders.top ? buildBorder(table.borders.top) : undefined,
        }
      : undefined,
    layout: table.layout === 'fixed' ? TableLayoutType.FIXED : TableLayoutType.AUTOFIT,
    rows: table.rows.map((row, index) => {
      const cells = row.map(
        (cell) =>
          new TableCell({
            children: (
              cell.children ?? [{ runs: [{ text: '' }], type: 'paragraph' as const }]
            ).flatMap((child) => buildBlock(child as ElementType) as Array<Paragraph | Table>),
            columnSpan: cell.colSpan,
            rowSpan: cell.rowSpan,
            shading: cell.shading ? buildShading(cell.shading) : undefined,
            verticalAlign: cell.verticalAlign ? VERTICAL_ALIGN[cell.verticalAlign] : undefined,
            width: cell.width ? { size: cell.width, type: WidthType.DXA } : undefined,
          }),
      );
      return new TableRow({ children: cells, tableHeader: table.headerRow === true && index === 0 });
    }),
    width: table.width ? { size: table.width, type: WidthType.DXA } : undefined,
  });

/**
 * Builds the `columns` property for the packer.
 * @param columns - Column count, or a count plus spacing in points.
 * @returns The docx columns descriptor, or undefined.
 */
const buildColumns = (
  columns: number | undefined | { count: number; spacing: number },
): undefined | { count: number; space: number } => {
  if (columns === undefined) return undefined;
  if (typeof columns === 'number') return { count: columns, space: 0 };
  return { count: columns.count, space: columns.spacing * POINTS };
};

/**
 * Section options for the packer.
 * @param section - The section descriptor.
 * @param section.properties - The section properties.
 * @param section.properties.columns - Column count, or count plus spacing in points.
 * @param section.properties.margins - Page margins in twentieths of a point (twips).
 * @param section.properties.margins.bottom - Bottom margin (twips).
 * @param section.properties.margins.left - Left margin (twips).
 * @param section.properties.margins.right - Right margin (twips).
 * @param section.properties.margins.top - Top margin (twips).
 * @param section.properties.orientation - Page orientation.
 * @param section.properties.pageSize - Page dimensions.
 * @param section.properties.pageSize.height - Page height (twips).
 * @param section.properties.pageSize.width - Page width (twips).
 * @param section.properties.sectionType - Section break type.
 * @returns The packer section options.
 */
export const buildSectionOptions = (section: {
  properties?: {
    columns?: number | { count: number; spacing: number };
    margins?: { bottom?: number; left?: number; right?: number; top?: number };
    orientation?: 'landscape' | 'portrait';
    pageSize?: { height: number; width: number };
    sectionType?: 'continuous' | 'evenPage' | 'nextColumn' | 'nextPage' | 'oddPage';
  };
}) => ({
  column: buildColumns(section.properties?.columns),
  page: {
    margin:
      section.properties?.margins === undefined
        ? undefined
        : {
            bottom: section.properties.margins.bottom,
            left: section.properties.margins.left,
            right: section.properties.margins.right,
            top: section.properties.margins.top,
          },
    size: {
      height: section.properties?.pageSize?.height ?? 16_848, // A4 default (twips)
      orientation:
        section.properties?.orientation === 'landscape' ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT,
      width: section.properties?.pageSize?.width ?? 11_906,
    },
  },
  type: section.properties?.sectionType ? SECTION_TYPE[section.properties.sectionType] : undefined,
});
