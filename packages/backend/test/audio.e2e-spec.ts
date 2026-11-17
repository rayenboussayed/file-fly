 
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { binaryParser, bootApp, FIXTURES_DIR, startFixtureServer } from './helpers.js';

describe('Audio (e2e)', () => {
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

  it('GET /audio transcodes to MP3', async () => {
    const response = await request(app.getHttpServer())
      .get('/audio')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ source: `${fixtures.url}/audio-0.mp3`, trimEnd: 0.1 })
      .buffer(true)
      .parse(binaryParser as never);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('audio/mpeg');
    const body = response.body as Buffer;
    expect(body.length).toBeGreaterThan(100);
  });

  it('GET /audio/metadata returns streams as JSON', async () => {
    const response = await request(app.getHttpServer())
      .get('/audio/metadata')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ source: `${fixtures.url}/audio-0.mp3` });

    expect(response.status).toBe(200);
    const body = response.body as { streams: Array<{ codec: number; index: number; sampleRate: number; }> };
    expect(body.streams).toHaveLength(1);
    expect(body.streams[0]!.sampleRate).toBe(44100);
  });

  it('GET /audio/stats returns stream details as JSON', async () => {
    const response = await request(app.getHttpServer())
      .get('/audio/stats')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ source: `${fixtures.url}/audio-0.mp3` });

    expect(response.status).toBe(200);
    const body = response.body as { duration: number; streams: Array<{ codec: number }> };
    expect(body.streams).toHaveLength(1);
  });

  it('POST /audio/metadata accepts an upload', async () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixture path is test-controlled
    const audio = await fs.promises.readFile(path.join(FIXTURES_DIR, 'audio-0.mp3'));

    const response = await request(app.getHttpServer())
      .post('/audio/metadata')
      .set('content-type', 'audio/mpeg')
      .send(audio);

    expect(response.status).toBe(201);
    const body = response.body as { streams: Array<{ sampleRate: number }> };
    expect(body.streams[0]!.sampleRate).toBe(44100);
  });

  it('POST /audio/stats accepts an upload', async () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixture path is test-controlled
    const audio = await fs.promises.readFile(path.join(FIXTURES_DIR, 'audio-0.mp3'));

    const response = await request(app.getHttpServer())
      .post('/audio/stats')
      .set('content-type', 'audio/mpeg')
      .send(audio);

    expect(response.status).toBe(201);
    expect((response.body as { streams: unknown[] }).streams).toHaveLength(1);
  });

  it('GET /audio/dna returns a Chromaprint fingerprint as JSON', async () => {
    const response = await request(app.getHttpServer())
      .get('/audio/dna')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ source: `${fixtures.url}/audio-0.mp3` });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    const body = response.body as {
      algorithm: string;
      env: { nodeAv: string };
      hash: string;
      length: number;
      version: string;
    };
    expect(body.algorithm).toBe('chromaprint');
    expect(body.version).toBe('chromaprint@1');
    const raw = Buffer.from(body.hash, 'base64');
    expect(raw.length % 4).toBe(0);
    expect(body).toHaveLength(raw.length / 4);
    expect(body.length).toBeGreaterThan(0);
    expect(typeof body.env.nodeAv).toBe('string');
    expect(body.env.nodeAv.length).toBeGreaterThan(0);
  });

  it('POST /audio/dna accepts an upload', async () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixture path is test-controlled
    const audio = await fs.promises.readFile(path.join(FIXTURES_DIR, 'audio-0.mp3'));

    const response = await request(app.getHttpServer())
      .post('/audio/dna')
      .set('content-type', 'audio/mpeg')
      .send(audio);

    expect(response.status).toBe(201);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    const body = response.body as {
      algorithm: string;
      env: { nodeAv: string };
      hash: string;
      length: number;
      version: string;
    };
    expect(body.algorithm).toBe('chromaprint');
    expect(body.version).toBe('chromaprint@1');
    const raw = Buffer.from(body.hash, 'base64');
    expect(raw.length % 4).toBe(0);
    expect(body).toHaveLength(raw.length / 4);
    expect(body.length).toBeGreaterThan(0);
    expect(typeof body.env.nodeAv).toBe('string');
    expect(body.env.nodeAv.length).toBeGreaterThan(0);
  });

  it('GET /audio/dna is deterministic', async () => {
    const first = await request(app.getHttpServer())
      .get('/audio/dna')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ source: `${fixtures.url}/audio-0.mp3` });
    const second = await request(app.getHttpServer())
      .get('/audio/dna')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ source: `${fixtures.url}/audio-0.mp3` });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect((second.body as { hash: string }).hash).toBe((first.body as { hash: string }).hash);
  });

  it('POST /audio/dna rejects a video upload with 415', async () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixture path is test-controlled
    const video = await fs.promises.readFile(path.join(FIXTURES_DIR, 'video-0.mp4'));

    const response = await request(app.getHttpServer())
      .post('/audio/dna')
      .set('content-type', 'video/mp4')
      .send(video);

    expect(response.status).toBe(415);
  });

  it('rejects a non-audio source with 403', async () => {
    const response = await request(app.getHttpServer())
      .get('/audio')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ source: `${fixtures.url}/not-an-image.txt` });

    expect(response.status).toBe(403);
  });

  it('rejects an unsupported output format with 400', async () => {
    const response = await request(app.getHttpServer())
      .get('/audio')
      // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
      .query({ format: 'aac', source: `${fixtures.url}/audio-0.mp3` });

    expect(response.status).toBe(400);
  });

  it('rejects a video upload on an audio route with 415', async () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixture path is test-controlled
    const video = await fs.promises.readFile(path.join(FIXTURES_DIR, 'video-0.mp4'));

    const response = await request(app.getHttpServer())
      .post('/audio/metadata')
      .set('content-type', 'video/mp4')
      .send(video);

    expect(response.status).toBe(415);
  });
});
