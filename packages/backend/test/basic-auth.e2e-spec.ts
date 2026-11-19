import type { NestFastifyApplication } from '@nestjs/platform-fastify';

import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// NOTE: `./helpers.js` (and the dist it pulls in) reads the environment at
// import time, so it must be imported dynamically AFTER the credentials are
// stubbed — statically importing it would freeze `basicAuthEnabled() === false`.
const FIXTURES_DIR = path.join('test', 'results', 'fixtures');
const IMAGE = path.join(FIXTURES_DIR, 'photo.jpg');
const AUTH_HEADERS = { 'x-auth-password': 'e2e-secret', 'x-auth-username': 'e2e-user' };

let app: NestFastifyApplication;

beforeAll(async () => {
  // The perimeter is configured at environment-parse time (import time), so the
  // credentials must be in place before any dist module is imported.
  process.env.AUTH_USERNAME = 'e2e-user';
  process.env.AUTH_PASSWORD = 'e2e-secret';
  const { bootApp } = await import('./helpers.js');
  app = await bootApp();
});

afterAll(async () => {
  delete process.env.AUTH_USERNAME;
  delete process.env.AUTH_PASSWORD;
  await app.close();
});

describe('basic auth perimeter (e2e)', () => {
  it('GET /health answers without credentials', async () => {
    const response = await request(app.getHttpServer()).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok' });
  });

  it('GET / answers 401 without credentials, with no WWW-Authenticate challenge', async () => {
    const response = await request(app.getHttpServer()).get('/');
    expect(response.status).toBe(401);
    expect(response.headers['www-authenticate']).toBeUndefined();
  });

  it('GET / answers 401 with a wrong password', async () => {
    const response = await request(app.getHttpServer())
      .get('/')
      .set('x-auth-username', 'e2e-user')
      .set('x-auth-password', 'wrong');
    expect(response.status).toBe(401);
  });

  it('GET / answers 401 with only a username', async () => {
    const response = await request(app.getHttpServer())
      .get('/')
      .set('x-auth-username', 'e2e-user');
    expect(response.status).toBe(401);
  });

  it('GET / answers 401 when a standard Authorization header is used instead', async () => {
    // The x-auth pair is the only accepted transport; Authorization is never honored.
    const authorization = `Basic ${Buffer.from('e2e-user:e2e-secret', 'utf8').toString('base64')}`;
    const response = await request(app.getHttpServer())
      .get('/')
      .set('authorization', authorization);
    expect(response.status).toBe(401);
  });

  it('GET / answers 200 with the x-auth pair', async () => {
    const response = await request(app.getHttpServer()).get('/').set(AUTH_HEADERS);
    expect(response.status).toBe(200);
    expect(response.text).toContain('<div id="root"></div>');
  });

  it('GET /assets/app.abc123.js is protected too (dashboard behind the perimeter)', async () => {
    const unauthed = await request(app.getHttpServer()).get('/assets/app.abc123.js');
    expect(unauthed.status).toBe(401);
    const authed = await request(app.getHttpServer())
      .get('/assets/app.abc123.js')
      .set(AUTH_HEADERS);
    expect(authed.status).toBe(200);
  });

  it('GET /metrics answers 401 without the pair (perimeter first, even in development)', async () => {
    const response = await request(app.getHttpServer()).get('/metrics');
    expect(response.status).toBe(401);
  });

  it('GET /metrics answers 200 with the pair (no METRICS_TOKEN needed for the perimeter to pass)', async () => {
    const response = await request(app.getHttpServer()).get('/metrics').set(AUTH_HEADERS);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ metricsDisabled: false });
  });

  it('POST /image answers 401 without the pair (rejected before scanning)', async () => {
    const image = fs.readFileSync(IMAGE);
    const response = await request(app.getHttpServer())
      .post('/image?format=webp&quality=50')
      .set('content-type', 'image/jpeg')
      .send(image);
    expect(response.status).toBe(401);
  });

  it('POST /image answers 201 with the pair (operation proceeds normally)', async () => {
    const image = fs.readFileSync(IMAGE);
    const response = await request(app.getHttpServer())
      .post('/image?format=webp&quality=50')
      .set('content-type', 'image/jpeg')
      .set(AUTH_HEADERS)
      .send(image);
    expect(response.status).toBe(201);
  });

  it('GET /swagger is behind the perimeter too', async () => {
    const unauthed = await request(app.getHttpServer()).get('/swagger');
    expect(unauthed.status).toBe(401);
  });
});
