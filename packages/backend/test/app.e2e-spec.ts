 
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bootApp, startFixtureServer } from './helpers.js';

describe('App (e2e)', () => {
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

  it('GET / returns Hello World!', async () => {
    const response = await request(app.getHttpServer()).get('/');

    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello World!');
  });

  it('returns 404 for an unknown route', async () => {
    const response = await request(app.getHttpServer()).get('/definitely-not-a-route');

    expect(response.status).toBe(404);
  });

  it('serves a source URL over HTTP', async () => {
    // eslint-disable-next-line deslint/no-sql-injection -- supertest .query() sets the HTTP query string, not SQL
    const response = await request(app.getHttpServer()).get('/image/metadata').query({ source: `${fixtures.url}/photo.jpg` });

    expect(response.status).toBe(200);
    expect((response.body as { width: number }).width).toBe(640);
  });
});
