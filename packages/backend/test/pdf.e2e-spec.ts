import type { NestFastifyApplication } from '@nestjs/platform-fastify';

import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { binaryParser, bootApp, FIXTURES_DIR } from './helpers.js';

const smallDoc = {
  metadata: { author: 'E2E Author', creator: 'file-fly', title: 'E2E PDF' },
  pages: [
    {
      elements: [
        { size: 22, text: 'E2E Heading', type: 'text', x: 72, y: 100 },
        { text: 'Round-trip body text for e2e extraction.', type: 'text', w: 400, x: 72, y: 150 },
        { format: '{n}', type: 'pageNumber', x: 72, y: 760 },
      ],
      size: 'a4',
    },
  ],
};

describe('Pdf (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await bootApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /pdf/build answers 201 with a pdf payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/pdf/build')
      .send(smallDoc)
      .set('content-type', 'application/json')
      .buffer(true)
      .parse(binaryParser as never);

    expect(response.status).toBe(201);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect((response.body as Buffer).subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(response.headers['content-disposition']).toBe('attachment; filename="export.pdf"');
  });

  it('built output round-trips through extract', async () => {
    const built = await request(app.getHttpServer())
      .post('/pdf/build')
      .send(smallDoc)
      .set('content-type', 'application/json')
      .buffer(true)
      .parse(binaryParser as never);
    expect(built.status).toBe(201);

    const extracted = await request(app.getHttpServer())
      .post('/pdf/extract')
      .set('content-type', 'application/pdf')
      .send(built.body as Buffer);

    expect(extracted.status).toBe(201);
    expect(extracted.body.format).toBe('pdf');
    expect(extracted.body.pageCount).toBe(1);
    expect(extracted.body.text).toContain('E2E Heading');
    expect(extracted.body.structure.pages[0].text).toContain('Round-trip body text');
    expect(extracted.body.metadata.title).toBe('E2E PDF');
    expect(extracted.body.metadata.author).toBe('E2E Author');
  });

  it('built output round-trips through metadata', async () => {
    const built = await request(app.getHttpServer())
      .post('/pdf/build')
      .send(smallDoc)
      .set('content-type', 'application/json')
      .buffer(true)
      .parse(binaryParser as never);

    const meta = await request(app.getHttpServer())
      .post('/pdf/metadata')
      .set('content-type', 'application/pdf')
      .send(built.body as Buffer);

    expect(meta.status).toBe(201);
    expect(meta.body).toMatchObject({
      author: 'E2E Author',
      creator: 'file-fly',
      format: 'pdf',
      pageCount: 1,
      title: 'E2E PDF',
    });
    expect(meta.body.pageSize).toMatchObject({ height: expect.any(Number), width: expect.any(Number) });
    expect(meta.body.orientation).toBe('portrait');
  });

  it('POST /pdf/build rejects standard-font text WinAnsi cannot encode with 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/pdf/build')
      .send({
        pages: [{ elements: [{ text: 'Ω mega', type: 'text', x: 72, y: 100 }], size: 'a4' }],
      })
      .set('content-type', 'application/json');

    expect(response.status).toBe(400);
    expect(response.body.code ?? response.body.message ?? JSON.stringify(response.body)).toContain('PDF_TEXT_NOT_REPRESENTABLE');
  });

  it('POST /pdf/build accepts embedded TTF for WinAnsi-unrepresentable text', async () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- path built from the test-results fixtures dir, never from user input
    const font = fs.readFileSync(path.join(FIXTURES_DIR, 'DejaVuSans.ttf'));
    const response = await request(app.getHttpServer())
      .post('/pdf/build')
      .send({
        embeddedFonts: [{ data: font.toString('base64'), name: 'DejaVu' }],
        pages: [{ elements: [{ font: 'DejaVu', text: 'Ω › €', type: 'text', x: 72, y: 100 }], size: 'a4' }],
      })
      .set('content-type', 'application/json')
      .buffer(true)
      .parse(binaryParser as never);

    expect(response.status).toBe(201);
    expect((response.body as Buffer).subarray(0, 5).toString('latin1')).toBe('%PDF-');
  });

  it('POST /pdf/extract answers 400 for junk query parameters', async () => {
    const response = await request(app.getHttpServer())
      .post('/pdf/extract?foo=bar')
      .set('content-type', 'application/pdf')
      .send(Buffer.from('%PDF-'));

    expect(response.status).toBe(400);
  });

  it('POST /pdf/build rejects an invalid image base64 payload with 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/pdf/build')
      .send({
        pages: [
          {
            elements: [
              { data: '!!! not base64 !!!', h: 10, imageType: 'png', type: 'image', w: 10, x: 0, y: 0 },
            ],
            size: 'a4',
          },
        ],
      })
      .set('content-type', 'application/json');

    expect(response.status).toBe(400);
  });

  it('built multi-page output round-trips through extract with page breaks', async () => {
    const built = await request(app.getHttpServer())
      .post('/pdf/build')
      .send({
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
      })
      .set('content-type', 'application/json')
      .buffer(true)
      .parse(binaryParser as never);
    expect(built.status).toBe(201);

    const extracted = await request(app.getHttpServer())
      .post('/pdf/extract')
      .set('content-type', 'application/pdf')
      .send(built.body as Buffer);

    expect(extracted.status).toBe(201);
    expect(extracted.body.pageCount).toBe(2);
    expect(extracted.body.structure.pages).toHaveLength(2);
    expect(extracted.body.structure.pages[1].text).toContain('segment two');
  });

  it('POST /pdf/build rejects a malformed body with 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/pdf/build')
      .send({ pages: 'nope' })
      .set('content-type', 'application/json');

    expect(response.status).toBe(400);
  });

  it('POST /pdf/extract rejects a docx upload with 415', async () => {
    const built = await request(app.getHttpServer())
      .post('/docx/build')
      .send({ sections: [{ children: [] }] })
      .set('content-type', 'application/json')
      .buffer(true)
      .parse(binaryParser as never);
    expect(built.status).toBe(201);

    const response = await request(app.getHttpServer())
      .post('/pdf/extract')
      .set('content-type', 'application/pdf')
      .send(built.body as Buffer);

    expect(response.status).toBe(415);
  });

  it('POST /pdf/extract rejects an infected payload with 422', async () => {
    const response = await request(app.getHttpServer())
      .post('/pdf/extract')
      .set('content-type', 'application/pdf')
      .send(Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE\n'));

    expect(response.status).toBe(422);
  });
});
