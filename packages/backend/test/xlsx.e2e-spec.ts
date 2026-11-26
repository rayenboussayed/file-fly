import type { NestFastifyApplication } from '@nestjs/platform-fastify';

import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { binaryParser, bootApp, FIXTURES_DIR } from './helpers.js';

// Path built from the test-results fixture dir, never from user input.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const readFixture = () => fs.readFileSync(path.join(FIXTURES_DIR, 'basic.xlsx'));

describe('Xlsx (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await bootApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /xlsx/build answers 201 with an xlsx payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/xlsx/build')
      .send({ sheets: [{ rows: [['a', 'b'], [1, true]] }] })
      .set('content-type', 'application/json')
      .buffer(true)
      .parse(binaryParser as never);

    expect(response.status).toBe(201);
    expect(response.headers['content-type']).toContain('spreadsheetml.sheet');
    expect((response.body as Buffer).subarray(0, 4).toString('latin1')).toBe('PK\u{3}\u{4}');
  });

  it('POST /xlsx/metadata reads the generated fixture', async () => {
    const response = await request(app.getHttpServer())
      .post('/xlsx/metadata')
      .set(
        'content-type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      .send(readFixture());

    expect(response.status).toBe(201);
    expect(response.body.sheets).toHaveLength(1);
    expect(response.body.sheets[0]).toMatchObject({
      cols: 2,
      name: 'People',
      rows: 3,
    });
    expect(response.body.totalCells).toBe(6);
  });

  it('POST /xlsx/extract returns typed records (header row, raw values)', async () => {
    const response = await request(app.getHttpServer())
      .post('/xlsx/extract')
      .set(
        'content-type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      .send(readFixture());

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      records: [{ count: 1, name: 'a' }, { count: 2, name: 'b' }],
      sheet: 'People',
    });
  });

  it('build output round-trips through extract', async () => {
    const built = await request(app.getHttpServer())
      .post('/xlsx/build')
      .send({ sheets: [{ rows: [['x', 'y'], [10, 'ok']] }] })
      .set('content-type', 'application/json')
      .buffer(true)
      .parse(binaryParser as never);
    expect(built.status).toBe(201);

    const extracted = await request(app.getHttpServer())
      .post('/xlsx/extract')
      .set(
        'content-type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      .send(built.body as Buffer);
    expect(extracted.status).toBe(201);
    expect(extracted.body).toEqual({
      records: [{ x: 10, y: 'ok' }],
      sheet: 'Sheet1',
    });
  });

  it('POST /xlsx/extract answers 415 for non-spreadsheet uploads', async () => {
    const response = await request(app.getHttpServer())
      .post('/xlsx/extract')
      .set('content-type', 'image/png')
      .send(readFixture());

    expect(response.status).toBe(415);
  });

  it('POST /xlsx/extract rejects an infected payload with 422', async () => {
    const response = await request(app.getHttpServer())
      .post('/xlsx/extract')
      .set(
        'content-type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      )
      .send(Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE\n'));

    expect(response.status).toBe(422);
  });

  it('POST /xlsx/build rejects a malformed body with 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/xlsx/build')
      .send({ sheets: [{ rows: 'not-an-array' }] })
      .set('content-type', 'application/json');

    expect(response.status).toBe(400);
  });
});
