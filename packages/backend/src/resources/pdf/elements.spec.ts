import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { buildPdfDocument } from './builder.js';
import { type ElementType, PdfBuildSchema } from './schema.js';

const parse = (elements: ElementType[]) =>
  PdfBuildSchema.parse({ pages: [{ elements, size: 'a4' }] });

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
    const fontPath = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
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
});
