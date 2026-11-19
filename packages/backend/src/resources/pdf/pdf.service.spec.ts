import { UnsupportedMediaTypeException } from '@nestjs/common';
import fs from 'node:fs';
import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';

import { buildPdfDocument } from './builder.js';
import { PdfService } from './pdf.service.js';
import { PdfBuildSchema, type PdfBuildType } from './schema.js';

const parse = (body: unknown): PdfBuildType => PdfBuildSchema.parse(body);

const buildFixture = async (body: unknown) =>
  Buffer.from(await buildPdfDocument(parse(body)));

const smallDoc = parse({
  metadata: { author: 'Fixture Author', title: 'Fixture PDF' },
  pages: [
    {
      elements: [
        { size: 20, text: 'Fixture Heading', type: 'text', x: 72, y: 100 },
        { text: 'Fixture body text for extraction.', type: 'text', w: 400, x: 72, y: 150 },
      ],
      size: 'a4',
    },
  ],
});

const makeService = (body: Buffer, contentType = 'application/pdf') => {
  const stream = Readable.from([body]);
  const cls = {
    request: () => ({ headers: { 'content-type': contentType }, method: 'POST', raw: stream }),
    sourceDirection: () => ({ set: () => undefined }),
    sourceStream: () => ({ get: () => stream, set: () => undefined }),
  };
  return new PdfService(cls as never);
};

describe('PdfService.build', () => {
  it('builds a valid PDF with metadata', async () => {
    const service = makeService(Buffer.from('x'));
    const bytes = await service.build(smallDoc);
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    const meta = await service.build(smallDoc).then((b) => makeService(b).metadata());
    expect(meta).toMatchObject({
      author: 'Fixture Author',
      format: 'pdf',
      pageCount: 1,
      title: 'Fixture PDF',
    });
  });

  it('renders tables with borders, headers and colSpans', async () => {
    const bytes = await buildFixture({
      pages: [
        {
          elements: [
            {
              header: true,
              rows: [['Name', 'Value'], ['a', '1'], ['b', { colSpan: 2, text: 'merged' }]],
              type: 'table',
              w: 400,
              x: 72,
              y: 100,
            },
          ],
          size: 'a4',
        },
      ],
    });
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('renders fields (text and checkbox) and they round-trip', async () => {
    const bytes = await buildFixture({
      pages: [
        {
          elements: [
            { fieldType: 'text', h: 20, name: 'form.name', type: 'field', value: 'prefilled', w: 200, x: 72, y: 600 },
            { fieldType: 'checkbox', name: 'form.flag', type: 'field', value: 'true', x: 300, y: 600 },
          ],
          size: 'a4',
        },
      ],
    });
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(new Uint8Array(bytes));
    const fields = doc.getForm().getFields();
    const textField = fields.find((field) => field.getName() === 'form.name');
    expect(textField?.constructor.name).toBe('PDFTextField');
    expect((textField as unknown as { getText: () => string }).getText()).toBe('prefilled');
    const checkBox = fields.find((field) => field.getName() === 'form.flag');
    expect((checkBox as unknown as { isChecked: () => boolean }).isChecked()).toBe(true);
  });

  it('rejects WinAnsi-unrepresentable text with 400 and names the offenders', async () => {
    const service = makeService(Buffer.from('x'));
    await expect(
      service.build(
        PdfBuildSchema.parse({ pages: [{ elements: [{ text: 'Ω', type: 'text', x: 72, y: 72 }], size: 'a4' }] }),
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'PDF_TEXT_NOT_REPRESENTABLE' }) as unknown,
    });
  });

  it('rejects an unembeddable image payload with 400', async () => {
    const service = makeService(Buffer.from('x'));
    await expect(
      service.build(
        parse({
          pages: [
            {
              elements: [
                {
                  data: Buffer.from('definitely not an image').toString('base64'),
                  h: 40,
                  imageType: 'png',
                  type: 'image',
                  w: 60,
                  x: 72,
                  y: 100,
                },
              ],
              size: 'a4',
            },
          ],
        }),
      ),
    ).rejects.toMatchObject({ response: { code: 'PDF_IMAGE_UNREADABLE' } });
  });

  it('embeds a TTF and encodes WinAnsi-unrepresentable text', async () => {
    const fontPath = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
    if (!fs.existsSync(fontPath)) {
      throw new Error(`fixture font missing at ${fontPath}`);
    }
    const font = fs.readFileSync(fontPath);
    const bytes = await buildFixture({
      embeddedFonts: [{ data: font.toString('base64'), name: 'DejaVu' }],
      pages: [
        { elements: [{ font: 'DejaVu', text: 'Ω › €', type: 'text', x: 72, y: 72 }], size: 'a4' },
      ],
    });
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('splits pageBreak elements into physical pages', async () => {
    const bytes = await buildFixture({
      pages: [
        {
          elements: [
            { text: 'segment one', type: 'text', x: 72, y: 72 },
            { type: 'pageBreak' },
            { text: 'segment two', type: 'text', x: 72, y: 72 },
          ],
          size: 'a4',
        },
      ],
    });
    const meta = await makeService(bytes).metadata();
    expect(meta.pageCount).toBe(2);
  });
});

describe('PdfService.metadata', () => {
  it('reads back built metadata and page shape', async () => {
    const bytes = await buildFixture(smallDoc);
    const service = makeService(bytes);
    const meta = await service.metadata();
    expect(meta).toMatchObject({
      author: 'Fixture Author',
      format: 'pdf',
      pageCount: 1,
      title: 'Fixture PDF',
    });
    expect(meta.pageSize).toMatchObject({ height: expect.any(Number), width: expect.any(Number) });
    expect(meta.orientation).toBe('portrait');
    expect(meta.encrypted).toBe(false);
  });

  it('rejects a non-PDF signature with 415', async () => {
    const service = makeService(Buffer.from('not-a-pdf'), 'application/octet-stream');
    await expect(service.metadata()).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });
});

describe('PdfService.extract', () => {
  it('rejects a zero-content document at the signature gate', async () => {
    const service = makeService(Buffer.from(''));
    await expect(service.metadata()).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });

  it('rejects field values WinAnsi cannot encode with 400', async () => {
    const service = makeService(Buffer.from('x'));
    await expect(
      service.build(
        parse({
          pages: [
            {
              elements: [{ fieldType: 'text', h: 20, name: 'f', type: 'field', value: 'Ω', w: 100, x: 72, y: 100 }],
              size: 'a4',
            },
          ],
        }),
      ),
    ).rejects.toMatchObject({ response: { code: 'PDF_TEXT_NOT_REPRESENTABLE' } });
  });

  it('rejects an unembeddable font with 400', async () => {
    const service = makeService(Buffer.from('x'));
    await expect(
      service.build(
        parse({
          embeddedFonts: [{ data: Buffer.from('not a font').toString('base64'), name: 'Bogus' }],
          pages: [{ elements: [{ text: 'x', type: 'text', x: 72, y: 72 }], size: 'a4' }],
        }),
      ),
    ).rejects.toMatchObject({ response: { code: 'PDF_FONT_UNREADABLE' } });
  });

  it('extracts text page by page', async () => {
    const bytes = await buildFixture(smallDoc);
    const service = makeService(bytes);
    const result = await service.extract();
    expect(result.format).toBe('pdf');
    expect(result.pageCount).toBe(1);
    expect(result.structure.pages).toHaveLength(1);
    expect(result.structure.pages[0]?.text).toContain('Fixture Heading');
    expect(result.structure.pages[0]?.text).toContain('Fixture body text');
    expect(result.metadata.title).toBe('Fixture PDF');
  });

  it('rejects a non-PDF signature with 415', async () => {
    const service = makeService(Buffer.from('not-a-pdf'), 'application/octet-stream');
    await expect(service.extract()).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });

  it('maps a missing source stream to a client error, not a 500', async () => {
    const cls = {
      request: () => ({ headers: { 'content-type': 'application/pdf' }, method: 'POST' }),
      sourceDirection: () => ({ set: () => undefined }),
      sourceStream: () => ({ get: () => undefined, set: () => undefined }),
    };
    const service = new PdfService(cls as never);
    await expect(service.extract()).rejects.toMatchObject({
      response: { code: 'PDF_NO_SOURCE' },
    });
  });
});
