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
    const fontPath = 'assets/fonts/DejaVuSans.ttf';
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

/**
 * Hand-crafts a minimal PDF with an optional /Info dict; usable where pdf-lib cannot (or chooses not to) emit one.
 * @param infoObject - The raw object body for the /Info dict (e.g. an empty-string CreationDate), or undefined for no /Info at all.
 * @param kids - The raw contents of the /Kids array of the pages object (e.g. `'3 0 R'`, or `''` for zero pages).
 * @param pageCount - The /Count value written into the pages object.
 * @param mediaBox - The raw MediaBox array for the single page object.
 * @returns The raw bytes of the hand-crafted PDF.
 */
const handCraftedPdf = (
  infoObject: string | undefined,
  kids: string,
  pageCount: number,
  mediaBox = '[0 0 200 200]',
): Buffer => {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox ${mediaBox} >>`,
  ];
  if (infoObject !== undefined) objects.push(infoObject);
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R${infoObject === undefined ? '' : ' /Info 4 0 R'} >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
};

const unreadablePdf = Buffer.from('%PDF-1.4\n@@@###$$$%%%^&*!!notrealpdfbody@@@', 'latin1');
/** Passes the signature gate (%PDF magic) but pdf-lib cannot parse it at all. */
const unparseablePdf = Buffer.from('%PDF-1.7\n%\xe2\xe3\xcf\xd3\n1 0 obj', 'latin1');

describe('PdfService.build metadata handling', () => {
  it('splits comma-joined keywords, trims and drops empties; round-trips subject/creator/language/creationDate', async () => {
    const bytes = await buildFixture({
      metadata: {
        creationDate: '2024-01-15T10:30:00.000Z',
        creator: 'Fixture Creator',
        keywords: 'alpha, beta ,, gamma',
        language: 'fr',
        subject: 'Fixture Subject',
      },
      pages: [{ elements: [{ text: 'body', type: 'text', x: 72, y: 72 }], size: 'a4' }],
    });
    const meta = await makeService(bytes).metadata();
    expect(meta.creator).toBe('Fixture Creator');
    expect(meta.subject).toBe('Fixture Subject');
    // pdf-lib joins the keyword array with single spaces; double spaces would mean the empty segment survived.
    expect(meta.keywords).toBe('alpha beta gamma');
    expect(meta.creationDate).toBe('2024-01-15T10:30:00.000Z');
    // No title/author were set: the setters must not run, so both read back undefined.
    expect(meta.title).toBeUndefined();
    expect(meta.author).toBeUndefined();
    // /Lang lives on the catalog and pdf-lib cannot read it back; assert the raw value instead.
    const { PDFDocument, PDFName, PDFString } = await import('pdf-lib');
    const doc = await PDFDocument.load(new Uint8Array(bytes));
    expect(doc.catalog.lookupMaybe(PDFName.of('Lang'), PDFString)?.decodeText()).toBe('fr');
  });

  it('accepts keywords as an array and writes them verbatim', async () => {
    const bytes = await buildFixture({
      metadata: { keywords: ['one', 'two', 'three'] },
      pages: [{ elements: [], size: 'a4' }],
    });
    const meta = await makeService(bytes).metadata();
    expect(meta.keywords).toBe('one two three');
  });

  it('rejects an unembeddable jpg payload with 400', async () => {
    await expect(
      buildFixture({
        pages: [
          {
            elements: [
              {
                data: Buffer.from('definitely not a jpeg').toString('base64'),
                h: 40,
                imageType: 'jpg',
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
    ).rejects.toMatchObject({ response: { code: 'PDF_IMAGE_UNREADABLE' } });
  });
});

describe('PdfService.metadata edge cases', () => {
  it('accepts a content-type with parameters', async () => {
    const bytes = await buildFixture(smallDoc);
    const service = makeService(bytes, 'application/pdf ; charset=binary');
    const meta = await service.metadata();
    expect(meta.format).toBe('pdf');
    expect(meta.pageCount).toBe(1);
  });

  it('rejects a missing content-type with 415', async () => {
    const cls = {
      request: () => ({ headers: {}, method: 'POST' }),
      sourceDirection: () => ({ set: () => undefined }),
      sourceStream: () => ({ get: () => undefined, set: () => undefined }),
    };
    const service = new PdfService(cls as never);
    await expect(service.extract()).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
    await expect(service.metadata()).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });

  it('rejects bytes pdf-lib cannot parse at all with 400 PDF_UNREADABLE', async () => {
    const service = makeService(unparseablePdf, 'application/octet-stream');
    await expect(service.metadata()).rejects.toMatchObject({ response: { code: 'PDF_UNREADABLE' } });
  });

  it('reports a zero-page document with no orientation and no page size', async () => {
    const bytes = handCraftedPdf(undefined, '', 0);
    const meta = await makeService(bytes).metadata();
    expect(meta.format).toBe('pdf');
    expect(meta.pageCount).toBe(0);
    expect(meta.orientation).toBeUndefined();
    expect(meta.pageSize).toBeUndefined();
  });

  it('reports a landscape document as landscape', async () => {
    const bytes = await buildFixture({ pages: [{ elements: [], orientation: 'landscape', size: 'a4' }] });
    const meta = await makeService(bytes).metadata();
    expect(meta.orientation).toBe('landscape');
    expect(meta.pageSize?.width).toBeCloseTo(841.89, 1);
    expect(meta.pageSize?.height).toBeCloseTo(595.28, 1);
  });

  it('reports a square page as portrait', async () => {
    const bytes = handCraftedPdf(undefined, '3 0 R', 1, '[0 0 300 300]');
    const meta = await makeService(bytes).metadata();
    expect(meta.orientation).toBe('portrait');
    expect(meta.pageSize).toMatchObject({ height: 300, width: 300 });
  });
});

describe('PdfService.extract edge cases', () => {
  it('extracts a document whose info dict carries no dates', async () => {
    const bytes = handCraftedPdf('<< /Title (No Dates Inside) >>', '3 0 R', 1);
    const result = await makeService(bytes).extract();
    expect(result.format).toBe('pdf');
    expect(result.pageCount).toBe(1);
    expect(result.metadata.title).toBe('No Dates Inside');
    expect(result.metadata.creationDate).toBeUndefined();
    expect(result.metadata.modificationDate).toBeUndefined();
    expect(result.structure.pages[0]?.text).toBe('');
  });

  it('stringifies info-dict dates pdf.js cannot parse', async () => {
    const bytes = handCraftedPdf('<< /CreationDate () >>', '3 0 R', 1);
    const result = await makeService(bytes).extract();
    expect(result.metadata.creationDate).toBe('');
  });

  it('rejects bytes that pass the signature gate but cannot be parsed as 400 PDF_UNREADABLE', async () => {
    const service = makeService(unreadablePdf, 'application/octet-stream');
    await expect(service.extract()).rejects.toMatchObject({ response: { code: 'PDF_UNREADABLE' } });
  });

  it('rejects a document with more than 500 pages with 400 PDF_TOO_MANY_PAGES', async () => {
    const { PDFDocument } = await import('pdf-lib');
    const big = await PDFDocument.create();
    for (let index = 0; index < 501; index += 1) big.addPage([50, 50]);
    const bytes = Buffer.from(await big.save());
    const service = makeService(bytes);
    await expect(service.extract()).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'PDF_TOO_MANY_PAGES' }) as unknown,
    });
  });
});
