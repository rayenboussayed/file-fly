import fs from 'node:fs';
import sharp from 'sharp';
import { extractText, getDocumentProxy } from 'unpdf';
import { describe, expect, it } from 'vitest';

import { buildPdfDocument } from './builder.js';
import { type BuilderContext, drawElement, pageSizeOf } from './elements.js';
import { type ElementType, PdfBuildSchema, type PdfPageType } from './schema.js';

const parse = (elements: ElementType[]) =>
  PdfBuildSchema.parse({ pages: [{ elements, size: 'a4' }] });

const pageOf = (overrides: Partial<PdfPageType> = {}): PdfPageType => ({
  elements: [],
  margin: { bottom: 72, left: 72, right: 72, top: 72 },
  orientation: 'portrait',
  size: 'a4',
  ...overrides,
});

const extractMarkers = async (bytes: Uint8Array): Promise<string> => {
  const proxy = await getDocumentProxy(new Uint8Array(bytes), { maxImageSize: 16 * 1024 * 1024 });
  const { text } = await extractText(proxy, { mergePages: false });
  return Array.isArray(text) ? text.join('\n') : String(text);
};

const pack = async (elements: ElementType[]): Promise<Buffer> =>
  Buffer.from(await buildPdfDocument(parse(elements)));

const png = await sharp({
  create: { background: { b: 50, g: 100, r: 200 }, channels: 3, height: 40, width: 60 },
})
  .png()
  .toBuffer();
const jpg = await sharp({
  create: { background: { b: 50, g: 100, r: 200 }, channels: 3, height: 40, width: 60 },
})
  .jpeg()
  .toBuffer();

describe('buildPdfDocument elements', () => {
  it('renders rect, ellipse, line and image elements', async () => {
    const bytes = await pack([
      { fill: 'FFEECC', h: 60, stroke: '333333', strokeWidth: 2, type: 'rect', w: 120, x: 72, y: 72 },
      { fill: 'DDEEFF', h: 60, stroke: '333333', type: 'ellipse', w: 120, x: 220, y: 72 },
      { color: '990000', dash: true, thickness: 2, type: 'line', x1: 72, x2: 400, y1: 150, y2: 150 },
      { data: Buffer.from(png).toString('base64'), h: 40, imageType: 'png', type: 'image', w: 60, x: 72, y: 170 },
      { data: Buffer.from(jpg).toString('base64'), h: 40, imageType: 'jpg', type: 'image', w: 60, x: 150, y: 170 },
    ]);
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('renders left/center/right aligned text with wrapping', async () => {
    const bytes = await pack([
      { align: 'center', text: 'Centered fairly long text that must be wrapped inside the box width when it exceeds the limit for sure', type: 'text', w: 120, x: 72, y: 72 },
      { align: 'right', text: 'Right aligned', type: 'text', w: 120, x: 72, y: 100 },
      { text: 'Wrapped left aligned paragraph text that goes beyond the one-hundred-and-twenty point box and wraps cleanly onto the next line of the page output', type: 'text', w: 120, x: 72, y: 128 },
    ]);
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('renders pageNumber with the page total', async () => {
    const bytes = await pack([
      { format: 'page {n} of {total}', type: 'pageNumber', x: 72, y: 760 },
      { format: '{n} / {total}', type: 'pageNumber', x: 300, y: 760 },
    ]);
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('renders a table with colWidths, header, colSpan and per-cell alignment', async () => {
    const bytes = await pack([
      {
        colWidths: [120, 80, 200],
        header: true,
        rows: [
          [{ text: 'Name' }, { text: 'Count' }, { text: 'Notes' }],
          ['alpha', '1', 'short'],
          ['beta', { colSpan: 2, fill: 'FFF0F0', text: 'spanning cell' }],
          ['gamma', '3', { align: 'right', text: 'right aligned note' }],
        ],
        type: 'table',
        w: 400,
        x: 72,
        y: 100,
      },
    ]);
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('renders text and checkbox fields with readable values', async () => {
    const bytes = await pack([
      { fieldType: 'text', h: 20, name: 'form.name', type: 'field', value: 'prefilled', w: 200, x: 72, y: 600 },
      { fieldType: 'checkbox', name: 'form.flag', type: 'field', value: 'true', x: 300, y: 600 },
    ]);
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(new Uint8Array(bytes));
    const fields = doc.getForm().getFields();
    const textField = fields.find((field) => field.getName() === 'form.name');
    const checkBox = fields.find((field) => field.getName() === 'form.flag');
    expect(textField?.constructor.name).toBe('PDFTextField');
    expect((textField as unknown as { getText: () => string }).getText()).toBe('prefilled');
    expect(checkBox?.constructor.name).toBe('PDFCheckBox');
    expect((checkBox as unknown as { isChecked: () => boolean }).isChecked()).toBe(true);
  });

  it('renders Symbol and ZapfDingbats standard fonts', async () => {
    const bytes = await pack([
      { font: 'Symbol', text: '\u0391\u0392', type: 'text', x: 72, y: 72 },
      { font: 'ZapfDingbats', text: '\u2726', type: 'text', x: 72, y: 100 },
      { font: 'Courier', text: 'mono', type: 'text', x: 72, y: 128 },
      { font: 'Times-Roman', text: 'serif', type: 'text', x: 72, y: 156 },
    ]);
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('skips WinAnsi preflight for embedded fonts', async () => {
    const fs = await import('node:fs');
    const fontPath = 'assets/fonts/DejaVuSans.ttf';
    if (!fs.existsSync(fontPath)) {
      throw new Error(`fixture font missing at ${fontPath}`);
    }
    const font = fs.readFileSync(fontPath);
    const bytes = await buildPdfDocument(
      PdfBuildSchema.parse({
        embeddedFonts: [{ data: font.toString('base64'), name: 'DejaVu' }],
        pages: [
          { elements: [{ font: 'DejaVu', text: 'Ω › €', type: 'text', x: 72, y: 72 }], size: 'a4' },
        ],
      }),
    );
    expect(Buffer.from(bytes.subarray(0, 5)).toString('latin1')).toBe('%PDF-');
  });

  it('swaps width and height for landscape pages', () => {
    const [width, height] = pageSizeOf(pageOf({ orientation: 'landscape', size: 'a4' }));
    expect(width).toBeCloseTo(841.89, 2);
    expect(height).toBeCloseTo(595.28, 2);
    const [tabloidWidth, tabloidHeight] = pageSizeOf(pageOf({ orientation: 'landscape', size: 'tabloid' }));
    expect(tabloidWidth).toBeCloseTo(1224, 2);
    expect(tabloidHeight).toBeCloseTo(792, 2);
  });

  it('falls back to a4 dimensions for an out-of-schema size', () => {
    // The schema enum restricts `size`, so an unknown size can only reach pageSizeOf
    // via a widened payload; the documented fallback is a4.
    const widened = pageOf({ size: 'b5' } as unknown as Partial<PdfPageType>);
    const [width, height] = pageSizeOf(widened);
    expect(width).toBeCloseTo(595.28, 2);
    expect(height).toBeCloseTo(841.89, 2);
  });

  it('renders a landscape page with swapped dimensions', async () => {
    const bytes = await buildPdfDocument(
      PdfBuildSchema.parse({ pages: [{ elements: [], orientation: 'landscape', size: 'tabloid' }] }),
    );
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(new Uint8Array(bytes));
    const { height, width } = doc.getPages()[0]?.getSize() ?? { height: 0, width: 0 };
    expect(width).toBeCloseTo(1224, 2);
    expect(height).toBeCloseTo(792, 2);
  });

  it('draws text with blank lines without crashing and keeps the other lines', async () => {
    // \n is not WinAnsi-representable, so blank lines only reach the wrapper via an embedded font.
    const fontPath = 'assets/fonts/DejaVuSans.ttf';
    if (!fs.existsSync(fontPath)) {
      throw new Error(`fixture font missing at ${fontPath}`);
    }
    const font = fs.readFileSync(fontPath);
    const bytes = await buildPdfDocument(
      PdfBuildSchema.parse({
        embeddedFonts: [{ data: font.toString('base64'), name: 'DejaVu' }],
        pages: [
          {
            elements: [{ font: 'DejaVu', text: 'line above blank\n\nline below blank', type: 'text', x: 72, y: 72 }],
            size: 'a4',
          },
        ],
      }),
    );
    const text = await extractMarkers(bytes);
    expect(text).toContain('line above blank');
    expect(text).toContain('line below blank');
  });

  it('skips blank lines in center/right aligned wrapped text', async () => {
    // \n is not WinAnsi-representable, so blank lines only reach the wrapper via an embedded font.
    const fontPath = 'assets/fonts/DejaVuSans.ttf';
    if (!fs.existsSync(fontPath)) {
      throw new Error(`fixture font missing at ${fontPath}`);
    }
    const font = fs.readFileSync(fontPath);
    const bytes = await buildPdfDocument(
      PdfBuildSchema.parse({
        embeddedFonts: [{ data: font.toString('base64'), name: 'DejaVu' }],
        pages: [
          {
            elements: [
              { align: 'center', font: 'DejaVu', text: 'centered first\n\ncentered third', type: 'text', w: 200, x: 72, y: 72 },
              { align: 'right', font: 'DejaVu', text: '\n', type: 'text', w: 200, x: 72, y: 120 },
              { align: 'center', text: '', type: 'text', w: 200, x: 72, y: 160 },
            ],
            size: 'a4',
          },
        ],
      }),
    );
    const text = await extractMarkers(bytes);
    expect(text).toContain('centered first');
    expect(text).toContain('centered third');
  });

  it('renders a pageNumber with an embedded font and non-WinAnsi format text', async () => {
    const fontPath = 'assets/fonts/DejaVuSans.ttf';
    if (!fs.existsSync(fontPath)) {
      throw new Error(`fixture font missing at ${fontPath}`);
    }
    const font = fs.readFileSync(fontPath);
    const bytes = await buildPdfDocument(
      PdfBuildSchema.parse({
        embeddedFonts: [{ data: font.toString('base64'), name: 'DejaVu' }],
        pages: [
          {
            elements: [{ font: 'DejaVu', format: 'Ω {n} of {total}', type: 'pageNumber', x: 72, y: 760 }],
            size: 'a4',
          },
        ],
      }),
    );
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(new Uint8Array(bytes));
    expect(doc.getPageCount()).toBe(1);
    const text = await extractMarkers(bytes);
    expect(text).toContain('Ω 1 of 1');
  });

  it('renders shapes with default borders and without fill', async () => {
    const bytes = await pack([
      { h: 40, type: 'rect', w: 80, x: 72, y: 72 },
      { h: 40, stroke: '333333', type: 'rect', w: 80, x: 180, y: 72 },
      { dash: true, fill: 'CCDDEE', h: 40, stroke: '333333', type: 'rect', w: 80, x: 288, y: 72 },
      { h: 40, type: 'ellipse', w: 80, x: 72, y: 140 },
      { fill: 'EEFFEE', h: 40, stroke: '333333', type: 'ellipse', w: 80, x: 180, y: 140 },
      { type: 'line', x1: 72, x2: 400, y1: 240, y2: 240 },
    ]);
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(new Uint8Array(bytes));
    expect(doc.getPageCount()).toBe(1);
  });

  it('renders a table without a header row', async () => {
    const bytes = await pack([
      { rows: [['plain body cell', '17']], type: 'table', w: 240, x: 72, y: 100 },
    ]);
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(new Uint8Array(bytes));
    expect(doc.getPageCount()).toBe(1);
    const text = await extractMarkers(bytes);
    expect(text).toContain('plain body cell');
    expect(text).toContain('17');
  });

  it('falls back to an embedded font named Helvetica-Bold for the header row', async () => {
    const fontPath = 'assets/fonts/DejaVuSans.ttf';
    if (!fs.existsSync(fontPath)) {
      throw new Error(`fixture font missing at ${fontPath}`);
    }
    const font = fs.readFileSync(fontPath);
    const { StandardFonts } = await import('pdf-lib');
    const { default: fontkit } = await import('@pdf-lib/fontkit');
    // No standard Helvetica-Bold pre-embedded: the header row must fall back to the
    // embedded font that shadows the name.
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const page = pdfDoc.addPage([595.28, 841.89]);
    const defaultFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const embedded = await pdfDoc.embedFont(new Uint8Array(font), { subset: true });
    const ctx: BuilderContext = {
      defaultFont,
      fonts: new Map([['Helvetica-Bold', embedded]]),
      standard: new Map(),
    };
    const element: Extract<ElementType, { type: 'table' }> = {
      header: true,
      rows: [
        ['Name', 'Value'],
        ['alpha', '1'],
      ],
      type: 'table',
      w: 240,
      x: 72,
      y: 100,
    };
    drawElement(pdfDoc, page, element, ctx, new Map(), 1, 1);
    const bytes = await pdfDoc.save();
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    const text = await extractMarkers(bytes);
    expect(text).toContain('Name');
    expect(text).toContain('alpha');
  });

  it('renders a text field without value and with default size', async () => {
    const bytes = await pack([
      { fieldType: 'text', name: 'form.plain', type: 'field', x: 72, y: 600 },
      { fieldType: 'text', h: 20, name: 'form.explicit', type: 'field', w: 150, x: 72, y: 640 },
    ]);
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(new Uint8Array(bytes));
    const form = doc.getForm();
    const plain = form.getTextField('form.plain');
    const explicit = form.getTextField('form.explicit');
    expect(plain.getText()).toBeUndefined();
    // The default 150x20 box must match the explicit twin.
    const plainRect = plain.acroField.getWidgets()[0]?.getRectangle();
    const explicitRect = explicit.acroField.getWidgets()[0]?.getRectangle();
    expect(plainRect?.width).toBeCloseTo(explicitRect?.width ?? 0, 5);
    expect(plainRect?.height).toBeCloseTo(explicitRect?.height ?? 0, 5);
  });

  it('renders unchecked checkboxes for value other than "true"', async () => {
    const bytes = await pack([
      { fieldType: 'checkbox', name: 'form.no', type: 'field', value: 'false', x: 72, y: 600 },
      { fieldType: 'checkbox', name: 'form.unset', type: 'field', x: 120, y: 600 },
      { fieldType: 'checkbox', name: 'form.yes', type: 'field', value: 'true', x: 168, y: 600 },
    ]);
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(new Uint8Array(bytes));
    const form = doc.getForm();
    expect(form.getCheckBox('form.no').isChecked()).toBe(false);
    expect(form.getCheckBox('form.unset').isChecked()).toBe(false);
    expect(form.getCheckBox('form.yes').isChecked()).toBe(true);
  });

  it('throws when an image element was not pre-embedded', async () => {
    const { PDFDocument, StandardFonts } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const defaultFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const ctx: BuilderContext = { defaultFont, fonts: new Map(), standard: new Map() };
    const element = {
      data: Buffer.from(png).toString('base64'),
      h: 40,
      imageType: 'png',
      type: 'image',
      w: 60,
      x: 10,
      y: 10,
    } as const;
    expect(() => drawElement(pdfDoc, page, element, ctx, new Map(), 1, 1)).toThrow('image was not pre-embedded');
  });

  it('rejects an unknown font name with 400', async () => {
    await expect(
      buildPdfDocument(parse([{ font: 'NotARealFont', text: 'x', type: 'text', x: 72, y: 72 }])),
    ).rejects.toMatchObject({ response: expect.objectContaining({ code: 'PDF_UNKNOWN_FONT' }) as unknown });
  });

  it('throws on an unhandled element type reachable only via a widened union', async () => {
    const { PDFDocument, StandardFonts } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const defaultFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const ctx: BuilderContext = { defaultFont, fonts: new Map(), standard: new Map() };
    // The discriminated union covers every real type; widen it to exercise the documented backstop.
    const bogus = { type: 'mystery' } as unknown as Exclude<ElementType, { type: 'pageBreak' }>;
    expect(() => drawElement(pdfDoc, page, bogus, ctx, new Map(), 1, 1)).toThrow(/unhandled element type/);
  });
});
