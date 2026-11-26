import type { NestFastifyApplication } from '@nestjs/platform-fastify';

import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bootApp, FIXTURES_DIR, startFixtureServer } from './helpers.js';

const IMAGE = path.join(FIXTURES_DIR, 'photo.jpg');

describe('Metrics (e2e)', () => {
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

  it('GET /health answers the liveness payload', async () => {
    const response = await request(app.getHttpServer()).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok' });
    expect(typeof response.body.uptimeSeconds).toBe('number');
  });

  it('GET /metrics answers the dashboard payload shape', async () => {
    const response = await request(app.getHttpServer()).get('/metrics');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ inFlight: 0, metricsDisabled: false });
    expect(Array.isArray(response.body.last24h)).toBe(true);
    expect(Array.isArray(response.body.perIp)).toBe(true);
    expect(Array.isArray(response.body.perRoute)).toBe(true);
    expect(response.body.totals).toMatchObject({ requests: expect.any(Number) });
  });

  it('counts an upload, a processed response, and a cache hit', async () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixture path derived from the FIXTURES_DIR constant
    const image = fs.readFileSync(IMAGE);
    const upload = () =>
      request(app.getHttpServer())
        .post('/image?format=webp&quality=50')
        .set('content-type', 'image/jpeg')
        .send(image);

    const before = await request(app.getHttpServer()).get('/metrics');
    const requestsBefore: number = before.body.totals.requests;
    const bytesInBefore: number = before.body.totals.bytesIn;

    const first = await upload();
    expect(first.status).toBe(201);
    const after = await request(app.getHttpServer()).get('/metrics');
    expect(after.body.totals.requests).toBeGreaterThan(requestsBefore);
    expect(after.body.totals.bytesIn).toBeGreaterThan(bytesInBefore);
    expect(after.body.totals.filesIn).toBeGreaterThanOrEqual(1);
    expect(after.body.totals.filesOut).toBeGreaterThanOrEqual(1);
    expect(after.body.totals.bytesOut).toBeGreaterThan(0);
    const imageRoute = after.body.perRoute.find((entry: { route: string }) => entry.route === '/image');
    expect(imageRoute).toBeDefined();
    expect(imageRoute.requests).toBeGreaterThan(0);
    const perIp = after.body.perIp.find((entry: { ip: string }) => entry.ip === '127.0.0.1');
    expect(perIp).toBeDefined();
    expect(perIp.filesOut).toBeGreaterThanOrEqual(1);

    const second = await upload();
    expect(second.status).toBe(201);
    const afterSecond = await request(app.getHttpServer()).get('/metrics');
    expect(afterSecond.body.totals.cacheHits).toBeGreaterThanOrEqual(1);
  });

  it('does not instrument /metrics or /health', async () => {
    await request(app.getHttpServer()).get('/metrics');
    await request(app.getHttpServer()).get('/health');
    const response = await request(app.getHttpServer()).get('/metrics');
    const routes = response.body.perRoute.map((entry: { route: string }) => entry.route);
    expect(routes).not.toContain('/metrics');
    expect(routes).not.toContain('/health');
  });

  it('counts a remote source download as a file in and bytes in', async () => {
    const before = await request(app.getHttpServer()).get('/metrics');
    const bytesInBefore: number = before.body.totals.bytesIn;
    // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
    const response = await request(app.getHttpServer()).get('/image').query({ format: 'webp', quality: '50', source: `${fixtures.url}/photo.jpg` });
    expect(response.status).toBe(200);
    const after = await request(app.getHttpServer()).get('/metrics');
    expect(after.body.totals.bytesIn).toBeGreaterThan(bytesInBefore);
    expect(after.body.totals.filesIn).toBeGreaterThanOrEqual(1);
  });

  it('returns to zero in-flight after a concurrent burst', async () => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- fixture path derived from the FIXTURES_DIR constant
    const image = fs.readFileSync(IMAGE);
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .post('/image?format=webp&quality=80')
          .set('content-type', 'image/jpeg')
          .send(image),),
    );
    expect(results.every((response) => response.status === 201)).toBe(true);
    const after = await request(app.getHttpServer()).get('/metrics');
    expect(after.body.inFlight).toBe(0);
  });

  it('rejects a non-numeric content-length without hanging', async () => {
    const response = await request(app.getHttpServer())
      .post('/image')
      .set('content-type', 'image/jpeg')
      .set('content-length', 'not-a-number');
    expect(response.status).toBe(400);
  });

  it('keeps the 404 contract for unknown routes', async () => {
    const response = await request(app.getHttpServer()).get('/definitely-not-a-route');
    expect(response.status).toBe(404);
  });
});
