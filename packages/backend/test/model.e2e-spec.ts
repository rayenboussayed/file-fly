import type { NestFastifyApplication } from '@nestjs/platform-fastify';

import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { binaryParser, bootApp, FIXTURES_DIR } from './helpers.js';

// eslint-disable-next-line security/detect-non-literal-fs-filename -- path built from the fixtures dir, never from user input
const readModel = () => fs.readFileSync(path.join(FIXTURES_DIR, 'tiny.glb'));

describe('Model (e2e)', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await bootApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /model/metadata answers 201 with counts and bounds', async () => {
    const response = await request(app.getHttpServer())
      .post('/model/metadata')
      .set('content-type', 'model/gltf-binary')
      .send(readModel());

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      asset: { generator: expect.any(String), version: '2.0' },
      bounds: { max: [1, 1, 0], min: [0, 0, 0] },
      counts: { materials: 1, meshes: 1, triangles: 2, vertices: 4 },
      format: 'model',
    });
  });

  it('POST /model/extract answers 201 with the scene graph', async () => {
    const response = await request(app.getHttpServer())
      .post('/model/extract')
      .set('content-type', 'model/gltf-binary')
      .send(readModel());

    expect(response.status).toBe(201);
    expect(response.body.format).toBe('model');
    expect(response.body.scenes[0].name).toBe('TinyScene');
    expect(response.body.meshes[0].name).toBe('TinyMesh');
    expect(response.body.meshes[0].primitives[0].attributes).toContain('POSITION');
    expect(response.body.materials[0].baseColorFactor).toEqual([1, 0, 0, 1]);
    expect(response.body.textures[0]).toMatchObject({ mimeType: 'image/png' });
  });

  it('POST /model/optimize answers 201 with a GLB round-trip', async () => {
    const response = await request(app.getHttpServer())
      .post('/model/optimize?compress=meshopt&simplify=1&weld=true')
      .set('content-type', 'model/gltf-binary')
      .buffer(true)
      .parse(binaryParser as never)
      .send(readModel());

    expect(response.status).toBe(201);
    expect(response.headers['content-type']).toContain('model/gltf-binary');
    expect(response.headers['content-disposition']).toBe('attachment; filename="export.glb"');
    expect((response.body as Buffer).subarray(0, 4).toString('latin1')).toBe('glTF');

    const roundTrip = await request(app.getHttpServer())
      .post('/model/metadata')
      .set('content-type', 'model/gltf-binary')
      .send(response.body as Buffer);
    expect(roundTrip.body.format).toBe('model');
    expect(roundTrip.body.counts.meshes).toBe(1);
    expect(roundTrip.body.extensionsUsed).toContain('EXT_meshopt_compression');
  });

  it('POST /model/optimize with draco answers 201 with a GLB round-trip', async () => {
    const response = await request(app.getHttpServer())
      .post('/model/optimize?compress=draco')
      .set('content-type', 'model/gltf-binary')
      .buffer(true)
      .parse(binaryParser as never)
      .send(readModel());

    expect(response.status).toBe(201);
    expect((response.body as Buffer).subarray(0, 4).toString('latin1')).toBe('glTF');

    const roundTrip = await request(app.getHttpServer())
      .post('/model/metadata')
      .set('content-type', 'model/gltf-binary')
      .send(response.body as Buffer);
    expect(roundTrip.body.extensionsUsed).toContain('KHR_draco_mesh_compression');
  });

  it('POST /model/convert answers 201 with self-contained glTF JSON', async () => {
    const response = await request(app.getHttpServer())
      .post('/model/convert?to=gltf')
      .set('content-type', 'model/gltf-binary')
      .send(readModel());

    expect(response.status).toBe(201);
    expect(response.headers['content-type']).toContain('model/gltf+json');
    expect(response.headers['content-disposition']).toBe('attachment; filename="export.gltf"');
    expect(response.body.asset.version).toBe('2.0');
    expect(response.body.buffers[0].uri.startsWith('data:application/octet-stream')).toBe(true);
    expect(response.body.images[0].uri.startsWith('data:image/png')).toBe(true);
  });

  it('POST /model/convert?to=glb answers 201 with a GLB round-trip', async () => {
    const response = await request(app.getHttpServer())
      .post('/model/convert?to=glb')
      .set('content-type', 'model/gltf-binary')
      .buffer(true)
      .parse(binaryParser as never)
      .send(readModel());

    expect(response.status).toBe(201);
    expect((response.body as Buffer).subarray(0, 4).toString('latin1')).toBe('glTF');
  });

  it.each([
    ['extract', '/model/extract'],
    ['convert', '/model/convert?to=glb'],
    ['optimize', '/model/optimize'],
  ])('POST /model/%s rejects a corrupt GLB with 400', async (_name, route) => {
    const response = await request(app.getHttpServer())
      .post(route)
      .set('content-type', 'model/gltf-binary')
      .send(Buffer.from('glTF\u0002\u0000\u0000\u0000garbagebytes'));

    expect(response.status).toBe(400);
  });

  it('POST /model/optimize output round-trips through extract', async () => {
    const response = await request(app.getHttpServer())
      .post('/model/optimize?compress=meshopt')
      .set('content-type', 'model/gltf-binary')
      .buffer(true)
      .parse(binaryParser as never)
      .send(readModel());

    expect(response.status).toBe(201);
    const extracted = await request(app.getHttpServer())
      .post('/model/extract')
      .set('content-type', 'model/gltf-binary')
      .send(response.body as Buffer);

    expect(extracted.status).toBe(201);
    expect(extracted.body.meshes[0].name).toBe('TinyMesh');
    expect(extracted.body.scenes[0].nodes[0].name).toBe('TinyNode');
  });


  it('POST /model/metadata rejects a non-GLB upload with 415', async () => {
    const response = await request(app.getHttpServer())
      .post('/model/metadata')
      .set('content-type', 'model/gltf-binary')
      .send(Buffer.from('definitely not a glb at all'));

    expect(response.status).toBe(415);
  });

  it('POST /model/metadata rejects an infected payload with 422', async () => {
    const response = await request(app.getHttpServer())
      .post('/model/metadata')
      .set('content-type', 'model/gltf-binary')
      .send(Buffer.from('EICAR-STANDARD-ANTIVIRUS-TEST-FILE\n'));

    expect(response.status).toBe(422);
  });

  it('POST /model/optimize rejects junk query parameters with 400', async () => {
    const response = await request(app.getHttpServer())
      .post('/model/optimize?compress=bogus')
      .set('content-type', 'model/gltf-binary')
      .send(readModel());

    expect(response.status).toBe(400);
  });
});
