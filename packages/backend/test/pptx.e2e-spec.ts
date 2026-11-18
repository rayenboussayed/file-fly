import type { NestFastifyApplication } from '@nestjs/platform-fastify';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { binaryParser, bootApp } from './helpers.js';

const smallDeck = {
  layout: 'LAYOUT_16x9',
  metadata: { author: 'E2E Author', title: 'E2E Deck' },
  slides: [
    {
      elements: [
        {
          h: 1,
          runs: [{ bold: true, text: 'E2E Heading' }],
          type: 'text',
          w: 8,
          x: 1,
          y: 1,
        },
      ],
      notes: 'e2e notes',
    },
  ],
};

describe('Pptx (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await bootApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /pptx/build answers 201 with a pptx payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/pptx/build')
      .send(smallDeck)
      .set('content-type', 'application/json')
      .buffer(true)
      .parse(binaryParser as never);

    expect(response.status).toBe(201);
    expect(response.headers['content-type']).toContain('presentationml.presentation');
    expect((response.body as Buffer).subarray(0, 2).toString('latin1')).toBe('PK');
    expect(response.headers['content-disposition']).toContain('export.pptx');
  });

  it('POST /pptx/build rejects an svg image with 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/pptx/build')
      .send({
        slides: [
          {
            elements: [
              {
                data: 'PHN2Zy8+',
                h: 1,
                imageType: 'svg',
                type: 'image',
                w: 1,
                x: 1,
                y: 1,
              },
            ],
          },
        ],
      })
      .set('content-type', 'application/json');

    expect(response.status).toBe(400);
  });

  it('POST /pptx/build rejects an empty slides array with 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/pptx/build')
      .send({ slides: [] })
      .set('content-type', 'application/json');

    expect(response.status).toBe(400);
  });

  it('POST /pptx/build rejects a malformed body with 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/pptx/build')
      .send({ layout: 'LAYOUT_16x9', slides: 'nope' })
      .set('content-type', 'application/json');

    expect(response.status).toBe(400);
  });

  it('built output round-trips through extract', async () => {
    const built = await request(app.getHttpServer())
      .post('/pptx/build')
      .send(smallDeck)
      .set('content-type', 'application/json')
      .buffer(true)
      .parse(binaryParser as never);
    expect(built.status).toBe(201);

    const extracted = await request(app.getHttpServer())
      .post('/pptx/extract')
      .set(
        'content-type',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      )
      .send(built.body as Buffer);

    expect(extracted.status).toBe(201);
    expect(extracted.body.format).toBe('pptx');
    expect(extracted.body.structure.slides).toHaveLength(1);
    expect(extracted.body.structure.slides[0].texts).toContain('E2E Heading');
    expect(extracted.body.structure.notes.join('\n')).toContain('e2e notes');
  });

  it('built output round-trips through metadata', async () => {
    const built = await request(app.getHttpServer())
      .post('/pptx/build')
      .send(smallDeck)
      .set('content-type', 'application/json')
      .buffer(true)
      .parse(binaryParser as never);

    const meta = await request(app.getHttpServer())
      .post('/pptx/metadata')
      .set(
        'content-type',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      )
      .send(built.body as Buffer);

    expect(meta.status).toBe(201);
    expect(meta.body.format).toBe('pptx');
  });

  it('POST /pptx/extract rejects a docx upload with 415', async () => {
    const built = await request(app.getHttpServer())
      .post('/docx/build')
      .send({ sections: [{ children: [] }] })
      .set('content-type', 'application/json')
      .buffer(true)
      .parse(binaryParser as never);
    expect(built.status).toBe(201);

    const response = await request(app.getHttpServer())
      .post('/pptx/extract')
      .set(
        'content-type',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      )
      .send(built.body as Buffer);

    expect(response.status).toBe(415);
  });

  it('POST /pptx/extract rejects an infected payload with 422', async () => {
    const response = await request(app.getHttpServer())
      .post('/pptx/extract')
      .set(
        'content-type',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      )
      .send(Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE\n'));

    expect(response.status).toBe(422);
  });
});
