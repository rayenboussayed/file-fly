import type { NestFastifyApplication } from '@nestjs/platform-fastify';

import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { binaryParser, bootApp, FIXTURES_DIR } from './helpers.js';

const smallDoc = {
  metadata: { creator: 'E2E Author', title: 'E2E Fixture' },
  sections: [
    {
      children: [
        { heading: 1, runs: [{ text: 'E2E Heading' }], type: 'paragraph' },
        { runs: [{ text: 'Round-trip body text' }], type: 'paragraph' },
      ],
    },
  ],
};

describe('Docx (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await bootApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /docx/build answers 201 with a docx payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/docx/build')
      .send(smallDoc)
      .set('content-type', 'application/json')
      .buffer(true)
      .parse(binaryParser as never);

    expect(response.status).toBe(201);
    expect(response.headers['content-type']).toContain('wordprocessingml.document');
    expect((response.body as Buffer).subarray(0, 2).toString('latin1')).toBe('PK');
  });

  it('POST /docx/build rejects an svg image without a fallback with 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/docx/build')
      .send({
        sections: [
          {
            children: [
              { data: 'aW1hZ2U=', height: 10, imageType: 'svg', type: 'image', width: 10 },
            ],
          },
        ],
      })
      .set('content-type', 'application/json');

    expect(response.status).toBe(400);
  });

  it('POST /docx/build rejects a malformed body with 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/docx/build')
      .send({ sections: 'nope' })
      .set('content-type', 'application/json');

    expect(response.status).toBe(400);
  });

  it('built output round-trips through extract', async () => {
    const built = await request(app.getHttpServer())
      .post('/docx/build')
      .send(smallDoc)
      .set('content-type', 'application/json')
      .buffer(true)
      .parse(binaryParser as never);
    expect(built.status).toBe(201);

    const extracted = await request(app.getHttpServer())
      .post('/docx/extract')
      .set(
        'content-type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      )
      .send(built.body as Buffer);

    expect(extracted.status).toBe(201);
    expect(extracted.body.format).toBe('docx');
    expect(extracted.body.metadata).toMatchObject({
      creator: 'E2E Author',
      title: 'E2E Fixture',
    });
    expect(extracted.body.structure.headings).toEqual([{ level: 1, text: 'E2E Heading' }]);
    expect(extracted.body.text).toContain('Round-trip body text');
  });

  it('built output round-trips through metadata', async () => {
    const built = await request(app.getHttpServer())
      .post('/docx/build')
      .send(smallDoc)
      .set('content-type', 'application/json')
      .buffer(true)
      .parse(binaryParser as never);

    const meta = await request(app.getHttpServer())
      .post('/docx/metadata')
      .set(
        'content-type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      )
      .send(built.body as Buffer);

    expect(meta.status).toBe(201);
    expect(meta.body).toMatchObject({
      creator: 'E2E Author',
      format: 'docx',
      title: 'E2E Fixture',
    });
  });

  it('POST /docx/extract rejects an xlsx upload with 415', async () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- path built from the test-results fixtures dir, never from user input
    const xlsx = fs.readFileSync(path.join(FIXTURES_DIR, 'basic.xlsx'));
    const response = await request(app.getHttpServer())
      .post('/docx/extract')
      .set(
        'content-type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      )
      .send(xlsx);

    expect(response.status).toBe(415);
  });

  it('POST /docx/extract rejects an infected payload with 422', async () => {
    const response = await request(app.getHttpServer())
      .post('/docx/extract')
      .set(
        'content-type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      )
      .send(Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE\n'));

    expect(response.status).toBe(422);
  });
});
