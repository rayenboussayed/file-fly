import type { NestFastifyApplication } from '@nestjs/platform-fastify';

import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { bootApp } from './helpers.js';

describe('Csv (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await bootApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /csv/build answers 201 with a streamed CSV', async () => {
    const response = await request(app.getHttpServer())
      .post('/csv/build')
       
      .send({ options: { header: true }, records: [{ a: 1, b: 'x' }, { a: 2, b: 'y' }] })
      .set('content-type', 'application/json');

    expect(response.status).toBe(201);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.text).toBe('a,b\n1,x\n2,y\n');
  });

  it('POST /csv/build escapes formula cells by default', async () => {
    const response = await request(app.getHttpServer())
      .post('/csv/build')
      .send({ records: [['=2+2'], ['safe']] })
      .set('content-type', 'application/json');

    expect(response.status).toBe(201);
    expect(response.text).toBe("'=2+2\nsafe\n");
  });

  it('POST /csv/build honours options (delimiter, header)', async () => {
    const response = await request(app.getHttpServer())
      .post('/csv/build')
      .send({ options: { delimiter: ';', escape_formulas: false, header: true }, records: [{ a: 1, b: 2 }] })
      .set('content-type', 'application/json');

    expect(response.status).toBe(201);
    expect(response.text).toBe('a;b\n1;2\n');
  });

  it('POST /csv/build rejects a malformed body with 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/csv/build')
      .send({ options: { bom: 'yes' }, records: [['unclosed\n']] })
      .set('content-type', 'application/json');

    expect(response.status).toBe(400);
  });

  it('POST /csv/extract parses the uploaded CSV and answers 201', async () => {
    const response = await request(app.getHttpServer())
      .post('/csv/extract')
      .set('content-type', 'text/csv')
      .send('a,b\n1,2\n3,4\n');

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ records: [['a', 'b'], ['1', '2'], ['3', '4']] });
  });

  it('POST /csv/extract casts types and maps header columns', async () => {
    const response = await request(app.getHttpServer())
      .post('/csv/extract?columns=true&cast=true')
      .set('content-type', 'text/csv')
      .send('a,b\n1,2\n');

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ records: [{ a: 1, b: 2 }] });
  });

  it('POST /csv/extract answers 415 for a wrong content type', async () => {
    const response = await request(app.getHttpServer())
      .post('/csv/extract')
      .set('content-type', 'application/x-yaml')
      .send('a,b\n1,2\n');

    expect(response.status).toBe(415);
  });

  it('POST /csv/extract answers 415 for registered but non-CSV uploads', async () => {
    const response = await request(app.getHttpServer())
      .post('/csv/extract')
      .set('content-type', 'image/png')
      .send(Buffer.from('not-a-png'));

    expect(response.status).toBe(415);
  });

  it('POST /csv/metadata reports rows, columns and types', async () => {
    const response = await request(app.getHttpServer())
      .post('/csv/metadata')
      .set('content-type', 'text/csv')
      .send('a,b\n1,true\n2,false\n');

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      columns: 2,
      delimiter: 'auto',
      rows: 3,
      truncatedTypes: false,
    });
    expect(response.body.perColumn[0].types.number).toBe(2);
    expect(response.body.perColumn[1].types.boolean).toBe(2);
  });

  it('POST /csv/metadata answers 422 for an infected payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/csv/metadata')
      .set('content-type', 'text/csv')
      .send('a,b\nEICAR-STANDARD-ANTIVIRUS-TEST-FILE,x\n');

    expect(response.status).toBe(422);
  });

  it('build output round-trips through extract', async () => {
    const built = await request(app.getHttpServer())
      .post('/csv/build')
      .send({ options: { header: true }, records: [{ a: 1, b: 'x' }, { a: 2, b: 'y' }] })
      .set('content-type', 'application/json');
    expect(built.status).toBe(201);

    const extracted = await request(app.getHttpServer())
      .post('/csv/extract?columns=true')
      .set('content-type', 'text/csv')
      .send(built.text);
    expect(extracted.status).toBe(201);
    expect(extracted.body).toEqual({ records: [{ a: '1', b: 'x' }, { a: '2', b: 'y' }] });
  });

  it('POST /csv/extract rejects an infected payload with 422', async () => {
    const response = await request(app.getHttpServer())
      .post('/csv/extract')
      .set('content-type', 'text/csv')
      .send('a,b\nEICAR-STANDARD-ANTIVIRUS-TEST-FILE,x\n');

    expect(response.status).toBe(422);
  });
});
