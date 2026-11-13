 
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { binaryParser, bootApp, FIXTURES_DIR, multipartBoundary, parseMultipart, startFixtureServer } from './helpers.js';

describe('Video (e2e)', () => {
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

  it('GET /video/metadata returns duration and streams as JSON', async () => {
    const response = await request(app.getHttpServer())
      .get('/video/metadata')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ source: `${fixtures.url}/video-0.mp4` });

    expect(response.status).toBe(200);
    const body = response.body as { duration: number; streams: Array<{ type: number; width?: number }> };
    expect(body.duration).toBeGreaterThan(15);
    expect(body.streams).toHaveLength(2);
    expect(body.streams[0]!.width).toBe(1080);
  });

  it('POST /video/metadata accepts an upload', async () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixture path is test-controlled
    const video = await fs.promises.readFile(path.join(FIXTURES_DIR, 'video-0.mp4'));

    const response = await request(app.getHttpServer())
      .post('/video/metadata')
      .set('content-type', 'video/mp4')
      .send(video);

    expect(response.status).toBe(201);
    expect((response.body as { duration: number }).duration).toBeGreaterThan(15);
  });

  it('GET /video/stats returns streams as JSON', async () => {
    const response = await request(app.getHttpServer())
      .get('/video/stats')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ source: `${fixtures.url}/video-0.mp4` });

    expect(response.status).toBe(200);
    const body = response.body as { streams: Array<{ type: number }> };
    expect(body.streams).toHaveLength(2);
  });

  it('GET /video transcodes a short trimmed clip to MP4', async () => {
    const response = await request(app.getHttpServer())
      .get('/video')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ source: `${fixtures.url}/video-0.mp4`, trimEnd: 0.3, width: 160 })
      .buffer(true)
      .parse(binaryParser as never);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('video/mp4');
    const body = response.body as Buffer;
    expect(body.length).toBeGreaterThan(10_000);
    expect(body.subarray(4, 8).toString()).toBe('ftyp');
  });

  it('GET /video/screenshot returns a multipart/mixed body with one part per frame', async () => {
    const response = await request(app.getHttpServer())
      .get('/video/screenshot')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ frames: '0.5,1.25', source: `${fixtures.url}/video-0.mp4` })
      .buffer(true)
      .parse(binaryParser as never);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/^multipart\/mixed; boundary=/);

    const boundary = multipartBoundary(response.headers['content-type'] as string);
    const parts = parseMultipart(response.body as Buffer, boundary);
    expect(parts).toHaveLength(2);

    expect(parts[0]!.headers['x-frame-time']).toBe('0.5');
    expect(parts[1]!.headers['x-frame-time']).toBe('1.25');

    for (const part of parts) {
      expect(part.headers['content-type']).toBe('image/jpeg');
      expect(part.headers['content-length']).toBe(String(part.body.length));
      expect(part.body.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
    }
  });

  it('GET /video/screenshot returns a single frame', async () => {
    const response = await request(app.getHttpServer())
      .get('/video/screenshot')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ frames: '0.5', source: `${fixtures.url}/video-0.mp4` })
      .buffer(true)
      .parse(binaryParser as never);

    expect(response.status).toBe(200);
    const boundary = multipartBoundary(response.headers['content-type'] as string);
    const parts = parseMultipart(response.body as Buffer, boundary);
    expect(parts).toHaveLength(1);
    expect(parts[0]!.headers['x-frame-time']).toBe('0.5');
  });

  it('POST /video/screenshot accepts an upload and the frames query parameter', async () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixture path is test-controlled
    const video = await fs.promises.readFile(path.join(FIXTURES_DIR, 'video-0.mp4'));

    const response = await request(app.getHttpServer())
      .post('/video/screenshot')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ frames: '0.5' })
      .set('content-type', 'video/mp4')
      .send(video)
      .buffer(true)
      .parse(binaryParser as never);

    expect(response.status).toBe(201);
    expect(response.headers['content-type']).toMatch(/^multipart\/mixed; boundary=/);
    const boundary = multipartBoundary(response.headers['content-type'] as string);
    const parts = parseMultipart(response.body as Buffer, boundary);
    expect(parts).toHaveLength(1);
    expect(parts[0]!.body.subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
  });

  it('GET /video/dna returns a PDQ frame sequence as JSON', async () => {
    const response = await request(app.getHttpServer())
      .get('/video/dna')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ source: `${fixtures.url}/video-0.mp4` });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    const body = response.body as {
      algorithm: string;
      count: number;
      env: { nodeAv: string; pdqWasm: string; sharp: string };
      fps: number;
      frames: Array<{ hash: string; quality: number; t: number }>;
      version: string;
    };
    expect(body.algorithm).toBe('vid-pdq');
    expect(body.version).toBe('vid-pdq2fps@1');
    expect(body.fps).toBe(2);
    expect(Number.isInteger(body.count)).toBe(true);
    expect(body.count).toBeGreaterThanOrEqual(30);
    expect(body.count).toBeLessThanOrEqual(45);
    expect(body.frames).toHaveLength(body.count);
    for (const frame of body.frames) {
      expect(typeof frame.t).toBe('number');
      expect(frame.t).toBeGreaterThanOrEqual(0);
      expect(frame.hash).toMatch(/^[0-9a-f]{64}$/);
      expect(typeof frame.quality).toBe('number');
    }
    for (let index = 1; index < body.frames.length; index += 1) {
      // eslint-disable-next-line security/detect-object-injection -- index is bounded by the loop
      expect(body.frames[index]!.t).toBeGreaterThanOrEqual(body.frames[index - 1]!.t);
    }
    expect(typeof body.env.nodeAv).toBe('string');
    expect(body.env.nodeAv.length).toBeGreaterThan(0);
    expect(typeof body.env.pdqWasm).toBe('string');
    expect(body.env.pdqWasm.length).toBeGreaterThan(0);
    expect(typeof body.env.sharp).toBe('string');
    expect(body.env.sharp.length).toBeGreaterThan(0);
  });

  it('POST /video/dna accepts an upload', async () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixture path is test-controlled
    const video = await fs.promises.readFile(path.join(FIXTURES_DIR, 'video-0.mp4'));

    const response = await request(app.getHttpServer())
      .post('/video/dna')
      .set('content-type', 'video/mp4')
      .send(video);

    expect(response.status).toBe(201);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    const body = response.body as { algorithm: string; count: number; version: string };
    expect(body.algorithm).toBe('vid-pdq');
    expect(body.version).toBe('vid-pdq2fps@1');
    expect(Number.isInteger(body.count)).toBe(true);
    expect(body.count).toBeGreaterThanOrEqual(30);
    expect(body.count).toBeLessThanOrEqual(45);
  });

  it('rejects an invalid frames query with 400', async () => {
    const response = await request(app.getHttpServer())
      .get('/video/screenshot')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ frames: 'soon', source: `${fixtures.url}/video-0.mp4` });

    expect(response.status).toBe(400);
  });

  it('rejects a non-video source with 403', async () => {
    const response = await request(app.getHttpServer())
      .get('/video/metadata')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ source: `${fixtures.url}/not-an-image.txt` });

    expect(response.status).toBe(403);
  });

  it('rejects a video upload on an image route with 415', async () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixture path is test-controlled
    const video = await fs.promises.readFile(path.join(FIXTURES_DIR, 'video-0.mp4'));

    const response = await request(app.getHttpServer())
      .post('/image/metadata')
      .set('content-type', 'video/mp4')
      .send(video);

    expect(response.status).toBe(415);
  });
});
