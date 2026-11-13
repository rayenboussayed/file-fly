 
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { binaryParser, bootApp, FIXTURES_DIR, startFixtureServer } from './helpers.js';

describe('Image (e2e)', () => {
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

  it('GET /image resizes and re-encodes to JPEG', async () => {
    const response = await request(app.getHttpServer())
      .get('/image')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ source: `${fixtures.url}/photo.jpg`, width: 100 })
      .buffer(true)
      .parse(binaryParser as never);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('image/jpeg');
    const metadata = await sharp(response.body as Buffer).metadata();
    expect(metadata.width).toBe(100);
  });

  it('GET /image with format=png returns image/png', async () => {
    const response = await request(app.getHttpServer())
      .get('/image')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ format: 'png', source: `${fixtures.url}/photo.jpg` })
      .buffer(true)
      .parse(binaryParser as never);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('image/png');
    const metadata = await sharp(response.body as Buffer).metadata();
    expect(metadata.format).toBe('png');
  });

  it('POST /image accepts an uploaded image', async () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixture path is test-controlled
    const image = await fs.promises.readFile(path.join(FIXTURES_DIR, 'photo.jpg'));

    const response = await request(app.getHttpServer())
      .post('/image')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ width: 50 })
      .set('content-type', 'image/jpeg')
      .send(image)
      .buffer(true)
      .parse(binaryParser as never);

    expect(response.status).toBe(201);
    const metadata = await sharp(response.body as Buffer).metadata();
    expect(metadata.width).toBe(50);
  });

  it('GET /image/metadata returns sharp metadata as JSON', async () => {
    const response = await request(app.getHttpServer())
      .get('/image/metadata')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ source: `${fixtures.url}/photo.jpg` });

    expect(response.status).toBe(200);
    const body = response.body as { format: string; height: number; width: number; };
    expect(body.width).toBe(640);
    expect(body.height).toBe(160);
    expect(body.format).toBe('jpeg');
  });

  it('POST /image/metadata accepts an upload', async () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixture path is test-controlled
    const image = await fs.promises.readFile(path.join(FIXTURES_DIR, 'photo.jpg'));

    const response = await request(app.getHttpServer())
      .post('/image/metadata')
      .set('content-type', 'image/jpeg')
      .send(image);

    expect(response.status).toBe(201);
    expect((response.body as { width: number }).width).toBe(640);
  });

  it('GET /image/stats returns channel statistics as JSON', async () => {
    const response = await request(app.getHttpServer())
      .get('/image/stats')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ source: `${fixtures.url}/photo.jpg` });

    expect(response.status).toBe(200);
    const body = response.body as { channels: Array<Record<string, number>> };
    expect(body.channels).toHaveLength(3);
    expect(typeof body.channels[0]!.mean).toBe('number');
  });

  it('GET /image/ocr returns a preprocessed PNG', async () => {
    const response = await request(app.getHttpServer())
      .get('/image/ocr')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ source: `${fixtures.url}/photo.jpg` })
      .buffer(true)
      .parse(binaryParser as never);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('image/png');
    expect((response.body as Buffer).subarray(1, 4).toString()).toBe('PNG');
  });

  it('POST /image/ocr accepts an upload', async () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixture path is test-controlled
    const image = await fs.promises.readFile(path.join(FIXTURES_DIR, 'photo.jpg'));

    const response = await request(app.getHttpServer())
      .post('/image/ocr')
      .set('content-type', 'image/jpeg')
      .send(image)
      .buffer(true)
      .parse(binaryParser as never);

    expect(response.status).toBe(201);
    expect(response.headers['content-type']).toBe('image/png');
    expect((response.body as Buffer).subarray(1, 4).toString()).toBe('PNG');
  });

  it('rejects a non-image source with 403', async () => {
    const response = await request(app.getHttpServer())
      .get('/image')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ source: `${fixtures.url}/not-an-image.txt` });

    expect(response.status).toBe(403);
  });

  it('GET /image/dna returns a PDQ fingerprint as JSON', async () => {
    const response = await request(app.getHttpServer())
      .get('/image/dna')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ source: `${fixtures.url}/photo.jpg` });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    const body = response.body as {
      algorithm: string;
      env: { pdqWasm: string; sharp: string };
      hash: string;
      quality: number;
      version: string;
    };
    expect(body.algorithm).toBe('pdq');
    expect(body.version).toBe('pdq@1');
    expect(body.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(typeof body.quality).toBe('number');
    expect(typeof body.env.pdqWasm).toBe('string');
    expect(body.env.pdqWasm.length).toBeGreaterThan(0);
    expect(typeof body.env.sharp).toBe('string');
    expect(body.env.sharp.length).toBeGreaterThan(0);
  });

  it('POST /image/dna accepts an upload', async () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixture path is test-controlled
    const image = await fs.promises.readFile(path.join(FIXTURES_DIR, 'photo.jpg'));

    const response = await request(app.getHttpServer())
      .post('/image/dna')
      .set('content-type', 'image/jpeg')
      .send(image);

    expect(response.status).toBe(201);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    const body = response.body as {
      algorithm: string;
      env: { pdqWasm: string; sharp: string };
      hash: string;
      quality: number;
      version: string;
    };
    expect(body.algorithm).toBe('pdq');
    expect(body.version).toBe('pdq@1');
    expect(body.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(typeof body.quality).toBe('number');
    expect(typeof body.env.pdqWasm).toBe('string');
    expect(body.env.pdqWasm.length).toBeGreaterThan(0);
    expect(typeof body.env.sharp).toBe('string');
    expect(body.env.sharp.length).toBeGreaterThan(0);
  });

  it('GET /image/dna is deterministic', async () => {
    const first = await request(app.getHttpServer())
      .get('/image/dna')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ source: `${fixtures.url}/photo.jpg` });
    const second = await request(app.getHttpServer())
      .get('/image/dna')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ source: `${fixtures.url}/photo.jpg` });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((second.body as { hash: string }).hash).toBe((first.body as { hash: string }).hash);
  });

  it('POST /image/dna rejects a video upload with 415', async () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixture path is test-controlled
    const video = await fs.promises.readFile(path.join(FIXTURES_DIR, 'video-0.mp4'));

    const response = await request(app.getHttpServer())
      .post('/image/dna')
      .set('content-type', 'video/mp4')
      .send(video);

    expect(response.status).toBe(415);
  });

  it('POST /image/dna rejects an undetectable upload with 403', async () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixture path is test-controlled
    const text = await fs.promises.readFile(path.join(FIXTURES_DIR, 'not-an-image.txt'));

    const response = await request(app.getHttpServer())
      .post('/image/dna')
      .set('content-type', 'application/octet-stream')
      .send(text);

    expect(response.status).toBe(403);
  });

  it('rejects an invalid query with 400', async () => {
    const response = await request(app.getHttpServer())
      .get('/image')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ quality: -1, source: `${fixtures.url}/photo.jpg` });

    expect(response.status).toBe(400);
  });
});
