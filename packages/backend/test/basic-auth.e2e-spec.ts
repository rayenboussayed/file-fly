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
const MISSING_BODY = { message: 'Missing or bad formatted authorization header', statusCode: 401 };
const INVALID_BODY = { error: 'Unauthorized', message: 'Invalid credentials', statusCode: 401 };
const CHALLENGE = 'Basic realm="file-fly"';

const appReference: { current?: NestFastifyApplication } = {};

/**
 * Returns the booted app, or throws when a test runs before `beforeAll`.
 * @returns The Nest Fastify application under test.
 */
const getApp = (): NestFastifyApplication => {
  const app = appReference.current;
  if (app === undefined) throw new Error('app was not booted');
  return app;
};

beforeAll(async () => {
  // The perimeter is configured at environment-parse time (import time), so the
  // credentials must be in place before any dist module is imported.
  process.env.AUTH_USERNAME = 'e2e-user';
  process.env.AUTH_PASSWORD = 'e2e-secret';
  const { bootApp } = await import('./helpers.js');
  appReference.current = await bootApp();
});

afterAll(async () => {
  delete process.env.AUTH_USERNAME;
  delete process.env.AUTH_PASSWORD;
  await getApp().close();
});

describe('basic auth perimeter (e2e)', () => {
  it('GET /health answers without credentials', async () => {
    const response = await request(getApp().getHttpServer()).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok' });
  });

  it.each([
    { body: MISSING_BODY, headers: {}, label: 'no credentials' },
    {
      body: INVALID_BODY,
      headers: { 'x-auth-password': 'wrong', 'x-auth-username': 'e2e-user' },
      label: 'a wrong password',
    },
    {
      body: INVALID_BODY,
      headers: { 'x-auth-password': 'wrong-pass', 'x-auth-username': 'wrong-user' },
      label: 'a wrong pair',
    },
  ])('GET / answers 401 with $label and a WWW-Authenticate challenge', async ({ body, headers }) => {
    const response = await request(getApp().getHttpServer()).get('/').set(headers);
    expect(response.status).toBe(401);
    expect(response.headers['www-authenticate']).toBe(CHALLENGE);
    expect(response.body).toEqual(body);
  });

  it.each([
    { headers: { 'x-auth-username': 'e2e-user' }, label: 'only a username' },
    { headers: { 'x-auth-password': 'e2e-secret' }, label: 'only a password' },
    {
      headers: { 'x-auth-password': '', 'x-auth-username': 'e2e-user' },
      label: 'a partial pair',
    },
  ])('GET / answers 401 with $label', async ({ headers }) => {
    const response = await request(getApp().getHttpServer()).get('/').set(headers);
    expect(response.status).toBe(401);
    expect(response.headers['www-authenticate']).toBe(CHALLENGE);
    expect(response.body).toEqual(MISSING_BODY);
  });

  it('GET / answers 401 when a standard Authorization header is used instead', async () => {
    // The x-auth pair is the only accepted transport; Authorization is never honored.
    const authorization = `Basic ${Buffer.from('e2e-user:e2e-secret', 'utf8').toString('base64')}`;
    const response = await request(getApp().getHttpServer())
      .get('/')
      .set('authorization', authorization);
    expect(response.status).toBe(401);
    expect(response.headers['www-authenticate']).toBe(CHALLENGE);
    expect(response.body).toEqual(MISSING_BODY);
  });

  it('GET / answers 401 for a malformed base64 Authorization header', async () => {
    const response = await request(getApp().getHttpServer())
      .get('/')
      .set('authorization', 'Basic %%%not-base64%%%');
    expect(response.status).toBe(401);
    expect(response.headers['www-authenticate']).toBe(CHALLENGE);
    expect(response.body).toEqual(MISSING_BODY);
  });

  it('GET / answers 200 when the x-auth pair is sent alongside a Bearer token', async () => {
    const response = await request(getApp().getHttpServer())
      .get('/')
      .set(AUTH_HEADERS)
      .set('authorization', 'Bearer some-opaque-token');
    expect(response.status).toBe(200);
    expect(response.text).toContain('<div id="root"></div>');
  });

  it('GET / answers 200 with the x-auth pair', async () => {
    const response = await request(getApp().getHttpServer()).get('/').set(AUTH_HEADERS);
    expect(response.status).toBe(200);
    expect(response.text).toContain('<div id="root"></div>');
  });

  it('GET /assets/app.abc123.js is protected too (dashboard behind the perimeter)', async () => {
    const unauthed = await request(getApp().getHttpServer()).get('/assets/app.abc123.js');
    expect(unauthed.status).toBe(401);
    expect(unauthed.headers['www-authenticate']).toBe(CHALLENGE);
    expect(unauthed.body).toEqual(MISSING_BODY);
    const authed = await request(getApp().getHttpServer())
      .get('/assets/app.abc123.js')
      .set(AUTH_HEADERS);
    expect(authed.status).toBe(200);
  });

  it('GET /metrics answers 401 without the pair (perimeter first, even in development)', async () => {
    const response = await request(getApp().getHttpServer()).get('/metrics');
    expect(response.status).toBe(401);
    expect(response.headers['www-authenticate']).toBe(CHALLENGE);
    expect(response.body).toEqual(MISSING_BODY);
  });

  it('GET /metrics answers 200 with the pair (no METRICS_TOKEN needed for the perimeter to pass)', async () => {
    const response = await request(getApp().getHttpServer()).get('/metrics').set(AUTH_HEADERS);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ metricsDisabled: false });
  });

  it('POST /image answers 401 without the pair (rejected before scanning)', async () => {
    const image = fs.readFileSync(IMAGE);
    const response = await request(getApp().getHttpServer())
      .post('/image?format=webp&quality=50')
      .set('content-type', 'image/jpeg')
      .send(image);
    expect(response.status).toBe(401);
    expect(response.headers['www-authenticate']).toBe(CHALLENGE);
    expect(response.body).toEqual(MISSING_BODY);
  });

  it('POST /image answers 201 with the pair (operation proceeds normally)', async () => {
    const image = fs.readFileSync(IMAGE);
    const response = await request(getApp().getHttpServer())
      .post('/image?format=webp&quality=50')
      .set('content-type', 'image/jpeg')
      .set(AUTH_HEADERS)
      .send(image);
    expect(response.status).toBe(201);
  });

  it('GET /swagger is behind the perimeter too', async () => {
    const unauthed = await request(getApp().getHttpServer()).get('/swagger');
    expect(unauthed.status).toBe(401);
    expect(unauthed.headers['www-authenticate']).toBe(CHALLENGE);
    expect(unauthed.body).toEqual(MISSING_BODY);
    const authed = await request(getApp().getHttpServer()).get('/swagger').set(AUTH_HEADERS);
    expect(authed.status).not.toBe(401);
  });

  it('GET /unknown-url is behind the perimeter too', async () => {
    const response = await request(getApp().getHttpServer()).get('/this-route-does-not-exist');
    expect(response.status).toBe(401);
    expect(response.headers['www-authenticate']).toBe(CHALLENGE);
    expect(response.body).toEqual(MISSING_BODY);
  });

  it('OPTIONS preflight with an Origin is behind the perimeter', async () => {
    const response = await request(getApp().getHttpServer())
      .options('/')
      .set('Origin', 'https://example.com')
      .set('Access-Control-Request-Method', 'GET');
    expect(response.status).toBe(401);
    expect(response.headers['www-authenticate']).toBe(CHALLENGE);
    expect(response.body).toEqual(MISSING_BODY);
  });
});
