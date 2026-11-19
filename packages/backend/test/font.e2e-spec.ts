import type { NestFastifyApplication } from '@nestjs/platform-fastify';

import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { binaryParser, bootApp, FIXTURES_DIR } from './helpers.js';

// eslint-disable-next-line security/detect-non-literal-fs-filename -- path built from the test-results fixtures dir, never from user input
const readFont = () => fs.readFileSync(path.join(FIXTURES_DIR, 'DejaVuSans.ttf'));

describe('Font (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await bootApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /font/metadata answers 201 with font properties and signature check', async () => {
    const response = await request(app.getHttpServer())
      .post('/font/metadata')
      .set('content-type', 'font/ttf')
      .send(readFont());

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      availableFeatures: expect.arrayContaining(['kern']) as unknown as string[],
      familyName: 'DejaVu Sans',
      format: 'ttf',
      numGlyphs: expect.any(Number) as unknown as number,
      postscriptName: 'DejaVuSans',
      unitsPerEm: 2048,
    });
    expect(response.body.embedding.noEmbedding).toBe(false);
    expect(response.body.characterSetSize).toBeGreaterThan(5000);
  });

  it('POST /font/extract returns every glyph and the coverage', async () => {
    const response = await request(app.getHttpServer())
      .post('/font/extract')
      .set('content-type', 'font/ttf')
      .send(readFont());

    expect(response.status).toBe(201);
    expect(response.body.numGlyphs).toBe(response.body.glyphs.length);
    expect(response.body.returnedGlyphs).toBe(response.body.glyphs.length);
    expect(response.body.glyphs.some((glyph: { codePoints: number[] }) => glyph.codePoints.includes(65))).toBe(true);
    expect(response.body.glyphs[43]).toMatchObject({ advanceWidth: expect.any(Number), id: 43 });
  });

  it('POST /font/extract honors the limit query parameter', async () => {
    const response = await request(app.getHttpServer())
      .post('/font/extract?limit=5')
      .set('content-type', 'font/ttf')
      .send(readFont());

    expect(response.status).toBe(201);
    expect(response.body.glyphs).toHaveLength(5);
    expect(response.body.numGlyphs).toBeGreaterThan(6000);
    expect(response.body.returnedGlyphs).toBe(5);
  });

  it('POST /font/shape shapes with defaults and feature overrides', async () => {
    const response = await request(app.getHttpServer())
      .post('/font/shape?text=Hello')
      .set('content-type', 'font/ttf')
      .send(readFont());

    expect(response.status).toBe(201);
    expect(response.body.script).toBe('latn');
    expect(response.body.direction).toBe('ltr');
    expect(response.body.advanceWidth).toBeGreaterThan(0);
    expect(response.body.glyphs).toHaveLength(5);
  });

  it('POST /font/shape detects arabic and applies feature overrides', async () => {
    const withKern = await request(app.getHttpServer())
      .post('/font/shape?text=AV')
      .set('content-type', 'font/ttf')
      .send(readFont());
    const noKern = await request(app.getHttpServer())
      .post('/font/shape?features=-kern&text=AV')
      .set('content-type', 'font/ttf')
      .send(readFont());

    expect(withKern.body.advanceWidth).not.toEqual(noKern.body.advanceWidth);

    const arabic = await request(app.getHttpServer())
      .post('/font/shape?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7')
      .set('content-type', 'font/ttf')
      .send(readFont());
    expect(arabic.body.script).toBe('arab');
    expect(arabic.body.direction).toBe('rtl');
  });

  it('POST /font/subset returns a minimal sfnt for PDF embedding', async () => {
    const response = await request(app.getHttpServer())
      .post('/font/subset?text=Hi')
      .set('content-type', 'font/ttf')
      .buffer(true)
      .parse(binaryParser as never)
      .send(readFont());

    expect(response.status).toBe(201);
    expect(response.headers['content-type']).toContain('font/ttf');
    expect(response.headers['x-font-subset']).toBe('pdf-embed');
    expect(response.headers['content-disposition']).toContain('subset.ttf');
    expect((response.body as Buffer).subarray(0, 4).toString('latin1')).toBe('true');
  });

  it('POST /font/metadata rejects a non-font upload with 415', async () => {
    const response = await request(app.getHttpServer())
      .post('/font/metadata')
      .set('content-type', 'image/png')
      .send(readFont());

    expect(response.status).toBe(415);
  });

  it('POST /font/metadata rejects an infected payload with 422', async () => {
    const response = await request(app.getHttpServer())
      .post('/font/metadata')
      .set('content-type', 'font/ttf')
      .send(Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE\n'));

    expect(response.status).toBe(422);
  });

  it('POST /font/extract rejects an empty upload with 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/font/extract')
      .set('content-type', 'font/ttf')
      .send(Buffer.alloc(0));

    expect(response.status).toBe(400);
  });
});
