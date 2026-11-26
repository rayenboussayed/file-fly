import { BadRequestException } from '@nestjs/common';
import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  rgb,
  StandardFonts,
} from 'pdf-lib';

import { findUnencodableWinAnsi } from '@/utils/cp1252.js';

import type { ElementType, PdfPageType, TableCellType } from './schema.js';

const LINE_HEIGHT = 1.2;
const TABLE_PADDING = 4;
const BORDER_COLOR = rgb(0, 0, 0);
const HEADER_FILL = 'EEEEEE';
const DEFAULT_COLOR = '000000';

/**
Horizontal alignment for text, table cells and page-number rendering.
 */
type Align = 'center' | 'left' | 'right';

const hexToRgb = (hex: string) => {
  const value = Number.parseInt(hex, 16);
  return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
};

/**
Map of the 14 Standard PDF fonts to pdf-lib's StandardFonts enum.
 */
export const STANDARD: Record<string, (typeof StandardFonts)[keyof typeof StandardFonts]> = {
  Courier: StandardFonts.Courier,
  'Courier-Bold': StandardFonts.CourierBold,
  'Courier-BoldOblique': StandardFonts.CourierBoldOblique,
  'Courier-Oblique': StandardFonts.CourierOblique,
  Helvetica: StandardFonts.Helvetica,
  'Helvetica-Bold': StandardFonts.HelveticaBold,
  'Helvetica-BoldOblique': StandardFonts.HelveticaBoldOblique,
  'Helvetica-Oblique': StandardFonts.HelveticaOblique,
  Symbol: StandardFonts.Symbol,
  'Times-Bold': StandardFonts.TimesRomanBold,
  'Times-BoldItalic': StandardFonts.TimesRomanBoldItalic,
  'Times-Italic': StandardFonts.TimesRomanItalic,
  'Times-Roman': StandardFonts.TimesRoman,
  ZapfDingbats: StandardFonts.ZapfDingbats,
};

/**
Shared state for one build pass: every font and image must be resolved before drawing.
 */
export interface BuilderContext {
  defaultFont: PDFFont;
  /**
  Embedded (user-supplied and pre-embedded standard) fonts by public name.
   */
  fonts: Map<string, PDFFont>;
  /**
  Pre-embedded standard fonts (all that are referenced or Helvetica).
   */
  standard: Map<string, PDFFont>;
}

/**
 * Resolves a public font name to the pre-embedded font; missing names are a build error.
 * @param context - The pre-embedded font state.
 * @param name - The public font name, or undefined for the default.
 * @returns The embedded font.
 */
const resolveFont = (context: BuilderContext, name: string | undefined): PDFFont => {
  if (name === undefined) return context.defaultFont;
  const font = context.fonts.get(name) ?? context.standard.get(name);
  if (font) return font;
  throw new BadRequestException({ code: 'PDF_UNKNOWN_FONT', message: `unknown font "${name}"` });
};

/**
 * Looks up a standard font without prototype-index access.
 * @param name - The public font name.
 * @returns The enum value, or undefined.
 */
export const standardValueOf = (name: string): (typeof STANDARD)[string] | undefined =>
  Object.entries(STANDARD).find(([key]) => key === name)?.[1];

const NON_WINANSI_STANDARD = new Set(['Symbol', 'ZapfDingbats']);

/**
 * Whether the named font is a WinAnsi standard font (not Symbol/ZapfDingbats, not embedded).
 * @param context - The pre-embedded font state.
 * @param name - The public font name.
 * @returns True when the font is a WinAnsi standard font.
 */
const isStandardWinAnsiFont = (context: BuilderContext, name: string | undefined): boolean =>
  name === undefined || (standardValueOf(name) !== undefined && !context.fonts.has(name) && !NON_WINANSI_STANDARD.has(name));

/**
 * Throws 400 when any character is outside the WinAnsi encoding (standard fonts only).
 * @param text - The text to check.
 * @param where - Where in the document the text lives.
 */
const assertWinAnsiText = (text: string, where: string): void => {
  const bad = findUnencodableWinAnsi(text);
  if (bad.length === 0) return;
  const sample = bad.map(({ char, codePoint }) => `"${char}" (U+${codePoint.toString(16).padStart(4, '0')})`).join(', ');
  throw new BadRequestException({
    code: 'PDF_TEXT_NOT_REPRESENTABLE',
    message: `text not representable in WinAnsi at ${where} (${sample}); embed a TTF via \`embeddedFonts\` for this content`,
  });
};

/**
 * Belt-and-braces: any standard font rejects what its own encoding cannot carry.
 * @param font - The resolved font instance.
 * @param fontName - The public font name, for error messages.
 * @param text - The text to probe-encode.
 * @param where - Where in the document the text lives, for error messages.
 */
const assertFontEncodes = (font: PDFFont, fontName: string, text: string, where: string): void => {
  try {
    font.encodeText(text);
  } catch {
    throw new BadRequestException({
      code: 'PDF_TEXT_NOT_REPRESENTABLE',
      message: `text not representable in ${fontName} at ${where}; embed a TTF via \`embeddedFonts\` for this content`,
    });
  }
};

/**
Page dimensions in points (1 pt = 1/72 inch).
 */
const PAGE_SIZES: Record<string, [number, number]> = {
  a3: [841.89, 1190.55],
  a4: [595.28, 841.89],
  a5: [419.53, 595.28],
  legal: [612, 1008],
  letter: [612, 792],
  tabloid: [792, 1224],
};

/**
 * Page dimensions in points for the given size/orientation, landscape swaps them.
 * @param page - The validated page payload.
 * @returns The width and height in points.
 */
export const pageSizeOf = (page: PdfPageType): [number, number] => {
  const fallback: [number, number] = PAGE_SIZES['a4'] as [number, number];
  const [width, height] = Object.entries(PAGE_SIZES).find(([key]) => key === page.size)?.[1] ?? fallback;
  return page.orientation === 'landscape' ? [height, width] : [width, height];
};

/**
 * Word-greedy line breaking, respecting the given width at the given size.
 * @param text - The text to wrap.
 * @param font - The font used for measuring.
 * @param size - Font size in points.
 * @param maxWidth - Maximum line width in points.
 * @returns The wrapped lines.
 */
const wrapParagraph = (text: string, font: PDFFont, size: number, maxWidth: number): string[] => {
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current === '' ? word : `${current} ${word}`;
    const canFit = font.widthOfTextAtSize(candidate, size) <= maxWidth;
    if (current === '' || canFit) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = word;
  }
  if (current !== '') lines.push(current);
  return lines;
};

/**
 * Wraps text on newlines, then on words; empty paragraphs become blank lines.
 * @param text - The text to wrap.
 * @param font - The font used for measuring.
 * @param size - Font size in points.
 * @param maxWidth - Maximum line width in points.
 * @returns The wrapped lines.
 */
const wrapLines = (text: string, font: PDFFont, size: number, maxWidth: number): string[] => {
  const paragraphs = text.split('\n');
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.trim() === '') {
      lines.push('');
      continue;
    }
    lines.push(...wrapParagraph(paragraph, font, size, maxWidth));
  }
  return lines;
};

/**
 * Horizontal offset for a line within a box.
 * @param align - Horizontal alignment mode.
 * @param lineWidth - Measured width of the line in points.
 * @param boxWidth - Box width in points.
 * @returns The x offset in points from the box's left edge.
 */
const textOffset = (align: Align, lineWidth: number, boxWidth: number): number => {
  if (align === 'center') return (boxWidth - lineWidth) / 2;
  if (align === 'right') return boxWidth - lineWidth;
  return 0;
};

const drawTextAligned = (
  page: PDFPage,
  text: string,
  options: {
    align: Align;
    baseline: number;
    color: ReturnType<typeof rgb>;
    font: PDFFont;
    size: number;
    w?: number;
    x: number;
  },
): void => {
  const { align, baseline, color, font, size, w, x } = options;
  const lineHeight = size * LINE_HEIGHT;
  if (w === undefined || align === 'left') {
    // Uniform leading with the wrapped path (pdf-lib's default is 24 pt, always).
    const lines = w === undefined ? text.split('\n') : wrapLines(text, font, size, w);
    for (const [index, line] of lines.entries()) {
      if (line !== '') {
        page.drawText(line, { color, font, size, x, y: baseline - index * lineHeight });
      }
    }
    return;
  }
  const lines = wrapLines(text, font, size, w);
  for (const [index, line] of lines.entries()) {
    if (line === '') continue;
    const lineWidth = font.widthOfTextAtSize(line, size);
    const offset = textOffset(align, lineWidth, w);
    page.drawText(line, { color, font, size, x: x + offset, y: baseline - index * lineHeight });
  }
};

/**
 * Normalizes a table cell union (string or object) to the internal shape.
 * @param cell - The raw cell from the validated schema.
 * @returns The normalized cell.
 */
const cellOf = (
  cell: TableCellType,
): { align: Align; colSpan: number; fill?: string; size: number; text: string } =>
  typeof cell === 'string'
    ? { align: 'left', colSpan: 1, size: 11, text: cell }
    : { align: cell.align ?? 'left', colSpan: cell.colSpan ?? 1, fill: cell.fill, size: cell.size ?? 11, text: cell.text };

/**
 * Picks the header font for header rows, the body font otherwise.
 * @param font - The body font.
 * @param headerFont - The header font, for the header row.
 * @param isHeader - Whether this cell belongs to the header row.
 * @returns The font to use for this cell.
 */
const cellFontOf = (font: PDFFont, headerFont: PDFFont | undefined, isHeader: boolean): PDFFont =>
  isHeader ? (headerFont ?? font) : font;

/**
 * Measures a table row's height from its tallest cell after wrapping.
 * @param row - The normalized cells in the row.
 * @param colWidths - The resolved column widths in points.
 * @param font - The body font.
 * @param headerFont - The header font, for the header row.
 * @param isHeader - Whether this is the header row.
 * @returns The row height in points.
 */
const rowHeightOf = (
  row: Array<ReturnType<typeof cellOf>>,
  colWidths: number[],
  font: PDFFont,
  headerFont: PDFFont | undefined,
  isHeader: boolean,
): number => {
  const cellWidthAt = (col: number, colSpan: number) =>
    colWidths.slice(col, col + colSpan).reduce((sum, width) => sum + width, 0);
  let col = 0;
  let rowHeight = 0;
  for (const cell of row) {
    const width = cellWidthAt(col, cell.colSpan) - TABLE_PADDING * 2;
    const fontForCell = cellFontOf(font, headerFont, isHeader);
    const lines = wrapLines(cell.text, fontForCell, cell.size, Math.max(width, 10));
    rowHeight = Math.max(rowHeight, lines.length * cell.size * LINE_HEIGHT + TABLE_PADDING * 2);
    col += cell.colSpan;
  }
  return rowHeight;
};

/**
 * Paints one cell's text lines, vertically top-aligned with padding.
 * @param page - The target page.
 * @param cell - The normalized cell.
 * @param cellX - The cell's left edge in points.
 * @param cursorY - The cell's top edge (distance from the page top) in points.
 * @param innerWidth - The text column width in points.
 * @param font - The body font.
 * @param headerFont - The header font for the header row.
 * @param isHeader - Whether this cell belongs to the header row.
 */
const paintCellText = (
  page: PDFPage,
  cell: ReturnType<typeof cellOf>,
  cellX: number,
  cursorY: number,
  innerWidth: number,
  font: PDFFont,
  headerFont: PDFFont | undefined,
  isHeader: boolean,
): void => {
  const pageHeight = page.getHeight();
  const fontForCell = cellFontOf(font, headerFont, isHeader);
  const lines = wrapLines(cell.text, fontForCell, cell.size, innerWidth);
  let lineY = pageHeight - cursorY - cell.size - TABLE_PADDING;
  for (const line of lines) {
    const lineWidth = fontForCell.widthOfTextAtSize(line, cell.size);
    const offset = textOffset(cell.align, lineWidth, innerWidth);
    page.drawText(line, { font: fontForCell, size: cell.size, x: cellX + TABLE_PADDING + offset, y: lineY });
    lineY -= cell.size * LINE_HEIGHT;
  }
};

/**
 * Paints one row: cell backgrounds, borders and text.
 * @param page - The target page.
 * @param row - The normalized cells in the row.
 * @param colWidths - The resolved column widths in points.
 * @param cursorY - The row's top edge (distance from the page top) in points.
 * @param rowHeight - The row height in points.
 * @param startX - The row's left edge in points.
 * @param font - The body font.
 * @param headerFont - The header font for the header row.
 * @param isHeader - Whether this is the header row.
 * @param topToY - The y-from-top to pdf-lib y converter.
 */
const paintRow = (
  page: PDFPage,
  row: Array<ReturnType<typeof cellOf>>,
  colWidths: number[],
  cursorY: number,
  rowHeight: number,
  startX: number,
  font: PDFFont,
  headerFont: PDFFont | undefined,
  isHeader: boolean,
  topToY: (y: number, h: number) => number,
): void => {
  let cellX = startX;
  let col = 0;
  for (const cell of row) {
    const width = colWidths.slice(col, col + cell.colSpan).reduce((sum, w) => sum + w, 0);
    const pdfY = topToY(cursorY, rowHeight);
    const fill = cell.fill ?? (isHeader ? HEADER_FILL : undefined);
    page.drawRectangle({
      borderColor: BORDER_COLOR,
      borderWidth: 0.5,
      color: fill ? hexToRgb(fill) : undefined,
      height: rowHeight,
      width,
      x: cellX,
      y: pdfY,
    });
    paintCellText(page, cell, cellX, cursorY, Math.max(width - TABLE_PADDING * 2, 10), font, headerFont, isHeader);
    cellX += width;
    col += cell.colSpan;
  }
};

const buildTable = (
  page: PDFPage,
  element: Extract<ElementType, { type: 'table' }>,
  font: PDFFont,
  topToY: (y: number, h: number) => number,
  headerFont?: PDFFont,
): void => {
  const rows = element.rows.map((row) => row.map((cell) => cellOf(cell)));
  let columns = 0;
  for (const row of rows) {
    let rowColumns = 0;
    for (const cell of row) rowColumns += cell.colSpan;
    columns = Math.max(columns, rowColumns);
  }
  const colWidths = element.colWidths ?? Array.from({ length: columns }, () => element.w / columns);
  let cursorY = element.y;
  for (const [rowIndex, row] of rows.entries()) {
    const isHeader = element.header === true && rowIndex === 0;
    const rowHeight = rowHeightOf(row, colWidths, font, headerFont, isHeader);
    paintRow(page, row, colWidths, cursorY, rowHeight, element.x, font, headerFont, isHeader, topToY);
    cursorY += rowHeight;
  }
};

const drawTextElement = (
  page: PDFPage,
  element: Extract<ElementType, { type: 'text' }>,
  context: BuilderContext,
): void => {
  const font = resolveFont(context, element.font);
  const size = element.size ?? 12;
  if (isStandardWinAnsiFont(context, element.font)) assertWinAnsiText(element.text, 'text');
  assertFontEncodes(font, element.font ?? 'Helvetica', element.text, 'text');
  drawTextAligned(page, element.text, {
    align: element.align ?? 'left',
    baseline: page.getHeight() - element.y - size,
    color: hexToRgb(element.color ?? DEFAULT_COLOR),
    font,
    size,
    w: element.w,
    x: element.x,
  });
};

const drawPageNumberElement = (
  page: PDFPage,
  element: Extract<ElementType, { type: 'pageNumber' }>,
  context: BuilderContext,
  totalPages: number,
  pageNumber: number,
): void => {
  const font = resolveFont(context, element.font);
  const size = element.size ?? 10;
  const text = element.format
    .replaceAll('{n}', () => String(pageNumber))
    .replaceAll('{total}', () => String(totalPages));
  if (isStandardWinAnsiFont(context, element.font)) assertWinAnsiText(text, 'pageNumber');
  assertFontEncodes(font, element.font ?? 'Helvetica', text, 'pageNumber');
  page.drawText(text, {
    color: hexToRgb(element.color ?? DEFAULT_COLOR),
    font,
    size,
    x: element.x,
    y: page.getHeight() - element.y - size,
  });
};

const drawRectElement = (
  page: PDFPage,
  element: Extract<ElementType, { type: 'rect' }>,
): void => {
  const pageHeight = page.getHeight();
  page.drawRectangle({
    borderColor: element.stroke ? hexToRgb(element.stroke) : undefined,
    borderDashArray: element.dash ? [4, 2] : undefined,
    borderWidth: element.strokeWidth ?? (element.stroke ? 1 : 0),
    color: element.fill ? hexToRgb(element.fill) : undefined,
    height: element.h,
    width: element.w,
    x: element.x,
    y: pageHeight - element.y - element.h,
  });
};

const drawEllipseElement = (
  page: PDFPage,
  element: Extract<ElementType, { type: 'ellipse' }>,
): void => {
  const pageHeight = page.getHeight();
  page.drawEllipse({
    borderColor: element.stroke ? hexToRgb(element.stroke) : undefined,
    borderWidth: element.strokeWidth ?? (element.stroke ? 1 : 0),
    color: element.fill ? hexToRgb(element.fill) : undefined,
    x: element.x + element.w / 2,
    xScale: element.w / 2,
    y: pageHeight - element.y - element.h / 2,
    yScale: element.h / 2,
  });
};

const drawLineElement = (
  page: PDFPage,
  element: Extract<ElementType, { type: 'line' }>,
): void => {
  const pageHeight = page.getHeight();
  page.drawLine({
    color: hexToRgb(element.color ?? DEFAULT_COLOR),
    dashArray: element.dash ? [4, 2] : undefined,
    end: { x: element.x2, y: pageHeight - element.y2 },
    start: { x: element.x1, y: pageHeight - element.y1 },
    thickness: element.thickness ?? 1,
  });
};

const drawImageElement = (
  page: PDFPage,
  element: Extract<ElementType, { type: 'image' }>,
  images: Map<object, PDFImage>,
): void => {
  const image = images.get(element);
  if (!image) throw new Error('image was not pre-embedded');
  page.drawImage(image, {
    height: element.h,
    opacity: element.opacity,
    width: element.w,
    x: element.x,
    y: page.getHeight() - element.y - element.h,
  });
};

/**
 * Validates that every table cell text encodes with the table font (Helvetica WinAnsi).
 * @param element - The validated table element.
 * @param font - The table body font.
 */
const assertTableEncodable = (
  element: Extract<ElementType, { type: 'table' }>,
  font: PDFFont,
): void => {
  for (const row of element.rows) for (const cell of row) {
    const text = typeof cell === 'string' ? cell : cell.text;
    assertWinAnsiText(text, 'table');
    assertFontEncodes(font, 'Helvetica', text, 'table');
  }
};

const drawTableElement = (
  page: PDFPage,
  element: Extract<ElementType, { type: 'table' }>,
  context: BuilderContext,
): void => {
  const tableFont = resolveFont(context, undefined);
  assertTableEncodable(element, tableFont);
  const headerFont = element.header === true ? context.standard.get('Helvetica-Bold') ?? resolveFont(context, 'Helvetica-Bold') : undefined;
  buildTable(page, element, tableFont, (y, h) => page.getHeight() - y - h, headerFont);
};

const drawFieldElement = (
  pdfDocument: PDFDocument,
  page: PDFPage,
  element: Extract<ElementType, { type: 'field' }>,
  context: BuilderContext,
): void => {
  const topToY = (y: number, h: number) => page.getHeight() - y - h;
  const form = pdfDocument.getForm();
  if (element.fieldType === 'text') {
    if (element.value !== undefined) assertFontEncodes(context.defaultFont, 'Helvetica', element.value, `field ${element.name}`);
    const field = form.createTextField(element.name);
    if (element.value !== undefined) field.setText(element.value);
    const width = element.w ?? 150;
    const height = element.h ?? 20;
    field.addToPage(page, { height, width, x: element.x, y: topToY(element.y, height) });
    return;
  }
  const field = form.createCheckBox(element.name);
  if (element.value === 'true') field.check();
  const width = element.w ?? 14;
  const height = element.h ?? 14;
  field.addToPage(page, { height, width, x: element.x, y: topToY(element.y, height) });
};

/**
 * Draws one element onto the page (image/table/field handled via the pre-embedded state).
 * @param pdfDocument - The document being built (needed for the AcroForm).
 * @param page - The target page.
 * @param element - The validated element descriptor.
 * @param context - The pre-embedded font state.
 * @param images - The pre-embedded images.
 * @param totalPages - Logical page count, for pageNumber elements.
 * @param pageNumber - 1-based number of this page, for pageNumber elements.
 * @returns Nothing.
 */
export const drawElement = (
  pdfDocument: PDFDocument,
  page: PDFPage,
  element: Exclude<ElementType, { type: 'pageBreak' }>,
  context: BuilderContext,
  images: Map<object, PDFImage>,
  totalPages: number,
  pageNumber: number,
): void => {
  switch (element.type) {
    case 'ellipse': {
      drawEllipseElement(page, element);
      return;
    }
    case 'field': {
      drawFieldElement(pdfDocument, page, element, context);
      return;
    }
    case 'image': {
      drawImageElement(page, element, images);
      return;
    }
    case 'line': {
      drawLineElement(page, element);
      return;
    }
    case 'pageNumber': {
      drawPageNumberElement(page, element, context, totalPages, pageNumber);
      return;
    }
    case 'rect': {
      drawRectElement(page, element);
      return;
    }
    case 'table': {
      drawTableElement(page, element, context);
      return;
    }
    case 'text': {
      drawTextElement(page, element, context);
      return;
    }
    default: {
      return exhaustiveNever(element);
    }
  }
};

/**
 * Throws for an unrepresentable element; only reachable via a widened union.
 * @param value - The element the check failed on.
 * @throws {Error} Always.
 */
const exhaustiveNever = (value: never): never => {
  throw new Error(`unhandled element type: ${String(value)}`);
};

/**
 * Fonts referenced by an element (embedded or standard name).
 * @param element - The element to inspect.
 * @returns The referenced font names.
 */
export const collectFontNames = (
  element: Exclude<ElementType, { type: 'pageBreak' }>,
): Array<string | undefined> => {
  switch (element.type) {
    case 'pageNumber':
    case 'text': {
      return [element.font];
    }
    default: {
      return [];
    }
  }
};

/**
 * Splits each page's element list at `pageBreak` elements into physical page segments.
 * @param pages - The validated page payloads from the build request.
 * @returns The physical pages to draw, in order.
 */
export const segmentPages = (
  pages: Array<PdfPageType & { elements: ElementType[] }>,
): Array<{ elements: Array<Exclude<ElementType, { type: 'pageBreak' }>>; page: PdfPageType }> => {
  const segments: Array<{ elements: Array<Exclude<ElementType, { type: 'pageBreak' }>>; page: PdfPageType }> = [];
  for (const page of pages) {
    let current: Array<Exclude<ElementType, { type: 'pageBreak' }>> = [];
    for (const element of page.elements) {
      if (element.type === 'pageBreak') {
        segments.push({ elements: current, page });
        current = [];
        continue;
      }
      current.push(element);
    }
    segments.push({ elements: current, page });
  }
  return segments;
};
