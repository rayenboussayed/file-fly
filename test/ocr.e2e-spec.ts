 
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bootApp, FIXTURES_DIR, startFixtureServer } from './helpers.js';

describe('OCR (e2e)', () => {
  let app: NestFastifyApplication;
  let fixtures: Awaited<ReturnType<typeof startFixtureServer>>;

  beforeAll(async () => {
    app = await bootApp();
    fixtures = await startFixtureServer();
  });

  afterAll(async () => {
    await app.close();
    await fixtures.close();
  });

  it('GET /ocr extracts text from an image', async () => {
    const response = await request(app.getHttpServer())
      .get('/ocr')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ lang: 'eng', source: `${fixtures.url}/text.png` });

    expect(response.status).toBe(200);
    const body = response.body as { confidence: number; text: string };
    expect(body.confidence).toBeGreaterThan(50);
    expect(body.text).toMatch(/quick brown fox/i);
  });

  it('POST /ocr extracts text from an uploaded image', async () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixture path is test-controlled
    const image = await fs.promises.readFile(path.join(FIXTURES_DIR, 'text.png'));

    const response = await request(app.getHttpServer())
      .post('/ocr')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ lang: 'eng' })
      .set('content-type', 'image/png')
      .send(image);

    expect(response.status).toBe(201);
    const body = response.body as { confidence: number; text: string };
    expect(body.confidence).toBeGreaterThan(50);
    expect(body.text).toMatch(/quick brown fox/i);
  });

  it('POST /ocr with default language works without a lang param', async () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixture path is test-controlled
    const image = await fs.promises.readFile(path.join(FIXTURES_DIR, 'text.png'));

    const response = await request(app.getHttpServer())
      .post('/ocr')
      .set('content-type', 'image/png')
      .send(image);

    expect(response.status).toBe(201);
    expect((response.body as { text: string }).text.length).toBeGreaterThan(0);
  });

  it('rejects an upload above the 20 MiB limit with 413', async () => {
    // A real uncompressed TIFF > 20 MiB so file-type detects it as an image reliably.
    const side = 2700;
    const raw = Buffer.alloc(side * side * 3);
    let seed = 0x9e3779b9;
    for (let i = 0; i < raw.length; i++) {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; seed >>>= 0;
      // eslint-disable-next-line security/detect-object-injection -- index is bounded by the loop
      raw[i] = seed & 0xff;
    }
    const tiff = await sharp(raw, { raw: { channels: 3, height: side, width: side } }).tiff({ compression: 'none' }).toBuffer();
    expect(tiff.length).toBeGreaterThan(20 * 1024 * 1024);

    const response = await request(app.getHttpServer())
      .post('/ocr')
      .set('content-type', 'image/tiff')
      .send(tiff);

    expect(response.status).toBe(413);
  }, 60000);

  it('rejects an invalid language with 400', async () => {
    const response = await request(app.getHttpServer())
      .get('/ocr')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ lang: 'not a lang', source: `${fixtures.url}/text.png` });

    expect(response.status).toBe(400);
  });

  it('rejects a non-image source with 403', async () => {
    const response = await request(app.getHttpServer())
      .get('/ocr')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ source: `${fixtures.url}/not-an-image.txt` });

    expect(response.status).toBe(403);
  });
});
