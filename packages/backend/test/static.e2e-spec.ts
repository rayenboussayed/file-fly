import type { NestFastifyApplication } from '@nestjs/platform-fastify';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bootApp } from './helpers.js';

describe('Dashboard static serving (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await bootApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the SPA shell at / and at deep links', async () => {
    const root = await request(app.getHttpServer()).get('/').set('accept', 'text/html');
    expect(root.status).toBe(200);
    expect(root.text).toContain('<div id="root"></div>');

    const deep = await request(app.getHttpServer()).get('/ip/203.0.113.7').set('accept', 'text/html');
    expect(deep.status).toBe(200);
    expect(deep.text).toContain('<div id="root"></div>');
  });

  it('serves built assets but never index.html for missing files', async () => {
    const asset = await request(app.getHttpServer()).get('/assets/app.abc123.js');
    expect(asset.status).toBe(200);
    expect(asset.text).toContain("Reflect.set(globalThis, '__fixture', 1)");

    const missing = await request(app.getHttpServer()).get('/assets/definitely-missing.js').set('accept', 'text/html');
    expect(missing.status).toBe(404);
    expect(missing.text).not.toContain('<div id="root"></div>');
  });

  it('keeps the JSON 404 contract for unknown routes without an html accept header', async () => {
    const response = await request(app.getHttpServer()).get('/definitely-not-a-route');
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ statusCode: 404 });
  });

  it('serves the metrics API route instead of the SPA shell', async () => {
    const metrics = await request(app.getHttpServer()).get('/metrics').set('accept', 'text/html');
    expect(metrics.status).toBe(200);
    expect(metrics.body).toMatchObject({ metricsDisabled: false });
  });
});
