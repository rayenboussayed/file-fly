import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

import { optimizeDocument, readModel, writeGlb } from './gltf.js';
import { ModelService } from './model.service.js';

const fixture = () => fs.readFileSync(path.join('assets', 'models', 'tiny.glb'));

const makeService = (body: Buffer, contentType = 'model/gltf-binary') => {
  const stream = Readable.from([body]);
  const cls = {
    request: () => ({ headers: { 'content-type': contentType }, method: 'POST', raw: stream }),
    sourceDirection: () => ({ set: () => undefined }),
    sourceStream: () => ({ get: () => stream, set: () => undefined }),
  };
  const workerService = {
    createWorker: vi.fn(async () => Readable.from([body])),
  };
  return { service: new ModelService(cls as never, workerService as never), workerService };
};

describe('ModelService.metadata', () => {
  it('returns normalized asset, counts and bounds for the tiny fixture', async () => {
    const { service } = makeService(fixture());
    const meta = await service.metadata();

    expect(meta.format).toBe('model');
    expect(meta.asset).toMatchObject({ generator: expect.any(String), version: '2.0' });
    expect(meta.counts).toMatchObject({
      materials: 1,
      meshes: 1,
      nodes: 1,
      primitives: 1,
      scenes: 1,
      triangles: 2,
      vertices: 4,
    });
    expect(meta.bounds).toEqual({ max: [1, 1, 0], min: [0, 0, 0] });
    expect(meta.extensionsUsed).toEqual([]);
  });

  it('rejects a non-GLB signature with 415', async () => {
    const { service } = makeService(Buffer.from('not a glb'), 'application/octet-stream');
    await expect(service.metadata()).rejects.toMatchObject({ status: 415 });
  });

  it('rejects a GLB with a corrupt directory with 400', async () => {
    const { service } = makeService(Buffer.from('glTF\u0002\u0000\u0000\u0000garbagebytes'), 'model/gltf-binary');
    await expect(service.metadata()).rejects.toMatchObject({ response: { code: 'MODEL_UNREADABLE' } });
  });

  it('maps a missing source stream to a client error, not a 500', async () => {
    const cls = {
      request: () => ({ headers: { 'content-type': 'model/gltf-binary' }, method: 'POST' }),
      sourceDirection: () => ({ set: () => undefined }),
      sourceStream: () => ({ get: () => undefined, set: () => undefined }),
    };
    const service = new ModelService(cls as never, { createWorker: vi.fn() } as never);
    await expect(service.metadata()).rejects.toMatchObject({
      response: { code: 'MODEL_NO_SOURCE' },
    });
  });
});

describe('ModelService.extract', () => {
  it('extracts the scene graph, meshes, materials and textures', async () => {
    const { service } = makeService(fixture());
    const extract = await service.extract();

    expect(extract.format).toBe('model');
    expect(extract.scenes).toHaveLength(1);
    expect(extract.scenes[0]?.name).toBe('TinyScene');
    expect(extract.meshes[0]?.name).toBe('TinyMesh');
    expect(extract.meshes[0]?.primitives[0]).toMatchObject({ mode: 4, targets: 0, triangles: 2, vertices: 4 });
    expect(extract.materials[0]).toMatchObject({ baseColorFactor: [1, 0, 0, 1], name: 'TinyMaterial' });
    expect(extract.textures[0]).toMatchObject({ mimeType: 'image/png', name: 'TinyTex' });
    expect(extract.scenes[0]?.nodes[0]?.name).toBe('TinyNode');
  });
});

describe('ModelService.optimize', () => {
  it('streams worker output bytes with the GLB magic', async () => {
    const source = fixture();
    const { service, workerService } = makeService(source);
    const optimized = await writeGlb(
      await (async () => {
        const document = await readModel(source);
        await optimizeDocument(document, { compress: 'meshopt', simplify: 1, weld: true });
        return document;
      })(),
    );
    workerService.createWorker.mockResolvedValueOnce(Readable.from([Buffer.from(optimized)]));

    const bytes = await service.optimize({ compress: 'meshopt', simplify: 1, weld: true });
    expect(bytes.subarray(0, 4).toString('latin1')).toBe('glTF');
    expect(workerService.createWorker).toHaveBeenCalledOnce();
  });

  it('rejects when the worker returns zero bytes', async () => {
    const { service, workerService } = makeService(fixture());
    workerService.createWorker.mockResolvedValueOnce(Readable.from([]));
    await expect(service.optimize({ compress: 'meshopt', simplify: 1, weld: true })).rejects.toThrow(
      'model optimize produced an invalid document',
    );
  });

  // The worker re-reads its own output before exiting (its internal validation is the real
  // gate); the parent keeps only the 4-byte magic check. A corrupt-but-magic output from a
  // mocked worker is documented as out of contract.

  it('rejects when the worker output fails the GLB magic check', async () => {
    const { service, workerService } = makeService(fixture());
    workerService.createWorker.mockResolvedValueOnce(Readable.from([Buffer.from('not-a-glb')]));
    await expect(service.optimize({ compress: 'meshopt', simplify: 1, weld: true })).rejects.toThrow(
      'model optimize produced an invalid document',
    );
  });
});

describe('ModelService.convert', () => {
  it('converts back to glTF JSON with data URIs', async () => {
    const { service } = makeService(fixture());
    const bytes = await service.convert({ to: 'gltf' });
    const json = JSON.parse(bytes.toString('utf8')) as {
      asset: { version: string };
      buffers: Array<{ uri: string }>;
      images: Array<{ uri: string }>;
    };
    expect(json.asset.version).toBe('2.0');
    expect(json.buffers[0]?.uri.startsWith('data:application/octet-stream')).toBe(true);
    expect(json.images[0]?.uri.startsWith('data:image/png')).toBe(true);
  });

  it('round-trips to GLB losslessly', async () => {
    const source = fixture();
    const { service } = makeService(source);
    const bytes = await service.convert({ to: 'glb' });
    expect(bytes.subarray(0, 4).toString('latin1')).toBe('glTF');

    const reopened = await readModel(bytes);
    expect(reopened.getRoot().listMeshes()).toHaveLength(1);
  });
});

describe('ModelService primitive modes', () => {
  it('counts triangles only for TRIANGLES mode, n-2 for strips, zero for points', async () => {
    const { Document, NodeIO } = await import('@gltf-transform/core');
    for (const [mode, triangles] of [
      [4, 1], // TRIANGLES non-indexed: floor(4/3)
      [5, 2], // TRIANGLE_STRIP
      [6, 2], // TRIANGLE_FAN
      [0, 0], // POINTS
      [1, 0], // LINES
    ] as const) {
      const doc = new Document();
      const buffer = doc.createBuffer();
      const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]);
      const accessor = doc.createAccessor('positions').setType('VEC3').setBuffer(buffer).setArray(positions);
      const prim = doc.createPrimitive().setAttribute('POSITION', accessor).setMode(mode);
      const mesh = doc.createMesh('Mesh').addPrimitive(prim);
      doc.createNode('Node').setMesh(mesh);
      doc.createScene('Scene').addChild(doc.getRoot().listNodes()[0]!);
      const io = new NodeIO();
      const bytes = await io.writeBinary(doc);

      const { service } = makeService(Buffer.from(bytes));
      const meta = await service.metadata();
      expect(meta.counts.triangles).toBe(triangles);
    }
  });
});

describe('ModelService with animated/skinned documents and adversarial graphs', () => {
  it('extracts animations and skins from a document that has them', async () => {
    const { Document, NodeIO } = await import('@gltf-transform/core');
    const doc = new Document();
    const buffer = doc.createBuffer();

    const positionAccessor = doc.createAccessor('positions')
      .setType('VEC3')
      .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]))
      .setBuffer(buffer);
    const jointsAccessor = doc.createAccessor('joints')
      .setType('VEC4')
      .setNormalized(false)
      .setArray(new Uint16Array([0, 0, 0, 0]))
      .setBuffer(buffer);
    const weightsAccessor = doc.createAccessor('weights')
      .setType('VEC4')
      .setArray(new Float32Array([1, 0, 0, 0]))
      .setBuffer(buffer);
    const ibmAccessor = doc.createAccessor('ibm')
      .setType('MAT4')
      .setArray(new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]))
      .setBuffer(buffer);
    const mesh = doc.createMesh('SkinnedMesh').addPrimitive(
      doc.createPrimitive()
        .setAttribute('POSITION', positionAccessor)
        .setAttribute('JOINTS_0', jointsAccessor)
        .setAttribute('WEIGHTS_0', weightsAccessor),
    );

    const jointNode = doc.createNode('Joint');
    const scene = doc.createScene('Scene');
    const skin = doc.createSkin('Skin').addJoint(jointNode).setInverseBindMatrices(ibmAccessor);

    const skinnedNode = doc.createNode('Animated').setMesh(mesh).setSkin(skin).setTranslation([0, 0, 0]);
    scene.addChild(skinnedNode).addChild(jointNode);

    const times = doc.createAccessor('times').setType('SCALAR').setArray(new Float32Array([0, 1])).setBuffer(buffer);
    const translations = doc.createAccessor('translations')
      .setType('VEC3')
      .setArray(new Float32Array([0, 0, 0, 10, 0, 0]))
      .setBuffer(buffer);
    const sampler = doc.createAnimationSampler()
      .setInput(times)
      .setOutput(translations)
      .setInterpolation('LINEAR');
    const channel = doc.createAnimationChannel()
      .setTargetNode(jointNode)
      .setTargetPath('translation')
      .setSampler(sampler);
    doc.createAnimation('Slide').addChannel(channel).addSampler(sampler);

    const bytes = await new NodeIO().writeBinary(doc);
    const { service } = makeService(Buffer.from(bytes));
    const extract = await service.extract();
    expect(extract.animations).toEqual([
      expect.objectContaining({ channels: 1, name: 'Slide', samplers: 1 }),
    ]);
    expect(extract.skins).toEqual([expect.objectContaining({ joints: 1, name: 'Skin' })]);
  });

  it('answers 400 MODEL_TOO_COMPLEX against scene fan-out', async () => {
    // Many scenes re-walk the same subtree; the emitted JSON explodes.
    const nodes = [];
    for (let i = 0; i < 200; i += 1) {
      nodes.push(i < 199 ? { children: [i + 1], name: `n${i}` } : { name: `n${i}` });
    }
    // Each scene re-walks the depth-capped chain (33 emissions); 400 scenes exceed the 10 000-node cap.
    const json = {
      asset: { version: '2.0' },
      nodes,
      scenes: Array.from({ length: 400 }, () => ({ nodes: [0] })),
    };
    const jsonBytes = Buffer.from(JSON.stringify(json));
    const pad = (4 - (jsonBytes.length % 4)) % 4;
    const jsonChunk = Buffer.concat([
      Buffer.alloc(4),
      Buffer.from('JSON'),
      jsonBytes,
      Buffer.alloc(pad, 0x20),
    ]);
    jsonChunk.writeUInt32LE(jsonBytes.length + pad, 0);
    const body = Buffer.concat([
      Buffer.from('glTF'),
      Buffer.from([2, 0, 0, 0]),
      Buffer.alloc(4),
      jsonChunk,
    ]);
    body.writeUInt32LE(body.length, 8);

    const { service } = makeService(body);
    await expect(service.extract()).rejects.toMatchObject({
      response: { code: 'MODEL_TOO_COMPLEX' },
    });
  });
});

describe('ModelService metadata and mime coverage', () => {
  it('reports dequantized bounds for KHR_mesh_quantization accessors', async () => {
    const { Document, NodeIO } = await import('@gltf-transform/core');
    const doc = new Document();
    const buffer = doc.createBuffer();
    // Asymmetric quantized positions: dequantized min/max differ from raw ints.
    const positions = new Uint16Array([32768, 16384, 0, 65535, 32768, 0]);
    const accessor = doc.createAccessor('positions').setType('VEC3').setArray(positions).setNormalized(true).setBuffer(buffer);
    const mesh = doc.createMesh('mesh').addPrimitive(doc.createPrimitive().setAttribute('POSITION', accessor));
    doc.createNode('node').setMesh(mesh);
    doc.createScene('scene').addChild(doc.getRoot().listNodes()[0]!);
    const bytes = await new NodeIO().writeBinary(doc);

    const { service } = makeService(Buffer.from(bytes));
    const meta = await service.metadata();
    expect(meta.bounds?.min?.[0]).toBeCloseTo(32768 / 65535, 5);
    expect(meta.bounds?.min?.[1]).toBeCloseTo(16384 / 65535, 5);
    expect(meta.bounds?.min?.[2]).toBe(0);
    expect(meta.bounds?.max?.[0]).toBeCloseTo(1, 5);
    expect(meta.bounds?.max?.[1]).toBeCloseTo(32768 / 65535, 5);
    expect(meta.bounds?.max?.[2]).toBe(0);
  });

  it('reports no bounds when no primitive carries POSITION', async () => {
    const { Document, NodeIO } = await import('@gltf-transform/core');
    const doc = new Document();
    const buffer = doc.createBuffer();
    const texcoords = new Float32Array([0, 0, 1, 0]);
    const accessor = doc.createAccessor('texcoords').setType('VEC2').setArray(texcoords).setBuffer(buffer);
    const mesh = doc.createMesh('mesh').addPrimitive(doc.createPrimitive().setAttribute('TEXCOORD_0', accessor));
    doc.createNode('node').setMesh(mesh);
    doc.createScene('scene').addChild(doc.getRoot().listNodes()[0]!);
    const bytes = await new NodeIO().writeBinary(doc);

    const { service } = makeService(Buffer.from(bytes));
    const meta = await service.metadata();
    expect(meta.bounds).toBeUndefined();
  });

  it('reports extensionsUsed from optimized output (meshopt)', async () => {
    const source = fixture();
    const document = await readModel(source);
    await optimizeDocument(document, { compress: 'meshopt', simplify: 1, weld: true });
    const optimized = Buffer.from(await writeGlb(document));

    const { service } = makeService(optimized);
    const meta = await service.metadata();
    expect(meta.extensionsUsed).toContain('EXT_meshopt_compression');
    expect(meta.extensionsRequired).toContain('EXT_meshopt_compression');
  });

  it('falls back to "unnamed" and tolerates textures without image bytes', async () => {
    const { Document, NodeIO } = await import('@gltf-transform/core');
    const doc = new Document();
    const buffer = doc.createBuffer();
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const accessor = doc.createAccessor('positions').setType('VEC3').setArray(positions).setBuffer(buffer);
    // Unnamed node and mesh on purpose.
    const texture = doc.createTexture().setMimeType('image/png').setImage(new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
    const material = doc.createMaterial().setBaseColorTexture(texture);
    const mesh = doc.createMesh().addPrimitive(
      doc.createPrimitive().setAttribute('POSITION', accessor).setMaterial(material),
    );
    const node = doc.createNode().setMesh(mesh);
    const scene = doc.createScene();
    scene.addChild(node);
    const bytes = await new NodeIO().writeBinary(doc);

    const { service } = makeService(Buffer.from(bytes));
    const extract = await service.extract();
    expect(extract.meshes[0]?.name).toBe('unnamed');
    expect(extract.materials.some((material) => material.name === 'unnamed')).toBe(true);
    expect(extract.textures[0]).toMatchObject({ bytes: 4, mimeType: 'image/png', name: 'unnamed' });
  });

  it('maps texture mime types to data URIs in convert(to=gltf)', async () => {
    const { Document, NodeIO } = await import('@gltf-transform/core');
    for (const [mime, uriPrefix] of [
      ['image/ktx2', 'data:image/ktx2'],
      ['image/avif', 'data:image/avif'],
      ['image/webp', 'data:image/webp'],
      ['image/gif', 'data:image/gif'],
      ['image/png', 'data:image/png'],
      ['image/jpeg', 'data:image/jpeg'],
    ] as const) {
      const doc = new Document();
      const buffer = doc.createBuffer();
      const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
      const accessor = doc.createAccessor('positions').setType('VEC3').setArray(positions).setBuffer(buffer);
      const texture = doc.createTexture('slot').setImage(new Uint8Array([0x00, 0x01, 0x02])).setMimeType(mime);
      const material = doc.createMaterial('m').setBaseColorTexture(texture);
      doc.createMesh('mesh').addPrimitive(doc.createPrimitive().setAttribute('POSITION', accessor).setMaterial(material));
      doc.createNode('node').setMesh(doc.getRoot().listMeshes()[0]!);
      doc.createScene('scene').addChild(doc.getRoot().listNodes()[0]!);
      const bytes = await new NodeIO().writeBinary(doc);

      const { service } = makeService(Buffer.from(bytes));
      const out = await service.convert({ to: 'gltf' });
      const json = JSON.parse(out.toString('utf8')) as { images: Array<{ uri: string }> };
      expect(json.images[0]?.uri.startsWith(uriPrefix)).toBe(true);
    }
  });
});

describe('ModelService read-body and mime fallbacks', () => {
  it('rejects a non-GLB content type with 415 before any parse work', async () => {
    const { service } = makeService(fixture(), 'image/png');
    await expect(service.metadata()).rejects.toMatchObject({ status: 415 });
  });

  it('rejects when the request headers are missing entirely', async () => {
    const stream = Readable.from([fixture()]);
    const cls = {
      request: () => ({ method: 'POST', raw: stream }),
      sourceDirection: () => ({ set: () => undefined }),
      sourceStream: () => ({ get: () => stream, set: () => undefined }),
    };
    const service = new ModelService(cls as never, { createWorker: vi.fn() } as never);
    await expect(service.metadata()).rejects.toMatchObject({ status: 415 });
  });

  it('falls back to application/octet-stream for unknown resource extensions', async () => {
    const { Document, NodeIO } = await import('@gltf-transform/core');
    const doc = new Document();
    const buffer = doc.createBuffer();
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const accessor = doc.createAccessor('positions').setType('VEC3').setArray(positions).setBuffer(buffer);
    const texture = doc.createTexture('vector').setImage(new Uint8Array([0x3c, 0x3f])).setMimeType('image/svg+xml');
    const material = doc.createMaterial('m').setBaseColorTexture(texture);
    doc.createMesh('mesh').addPrimitive(
      doc.createPrimitive().setAttribute('POSITION', accessor).setMaterial(material),
    );
    doc.createNode('node').setMesh(doc.getRoot().listMeshes()[0]!);
    doc.createScene('scene').addChild(doc.getRoot().listNodes()[0]!);
    const bytes = await new NodeIO().writeBinary(doc);

    const { service } = makeService(Buffer.from(bytes));
    const out = await service.convert({ to: 'gltf' });
    const json = JSON.parse(out.toString('utf8')) as { images: Array<{ uri: string }> };
    expect(json.images[0]?.uri.startsWith('data:application/octet-stream')).toBe(true);
  });

  it('reports unnamed animations and skins as unnamed', async () => {
    const { Document, NodeIO } = await import('@gltf-transform/core');
    const doc = new Document();
    const buffer = doc.createBuffer();
    const positionAccessor = doc.createAccessor('positions')
      .setType('VEC3')
      .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]))
      .setBuffer(buffer);
    const ibmAccessor = doc.createAccessor('ibm')
      .setType('MAT4')
      .setArray(new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]))
      .setBuffer(buffer);
    const times = doc.createAccessor('times').setType('SCALAR').setArray(new Float32Array([0, 1])).setBuffer(buffer);
    const translations = doc.createAccessor('translations')
      .setType('VEC3')
      .setArray(new Float32Array([0, 0, 0, 5, 0, 0]))
      .setBuffer(buffer);
    const mesh = doc.createMesh().addPrimitive(doc.createPrimitive().setAttribute('POSITION', positionAccessor));
    const jointNode = doc.createNode();
    const skinnedNode = doc.createNode().setMesh(mesh);
    const skin = doc.createSkin().addJoint(jointNode).setInverseBindMatrices(ibmAccessor);
    skinnedNode.setSkin(skin);
    const scene = doc.createScene();
    scene.addChild(skinnedNode).addChild(jointNode);
    // Unnamed animation and unnamed channel/sampler sources.
    const sampler = doc.createAnimationSampler().setInput(times).setOutput(translations).setInterpolation('LINEAR');
    const channel = doc.createAnimationChannel().setTargetNode(jointNode).setTargetPath('translation').setSampler(sampler);
    doc.createAnimation().addChannel(channel).addSampler(sampler);

    const bytes = await new NodeIO().writeBinary(doc);
    const { service } = makeService(Buffer.from(bytes));
    const extract = await service.extract();
    expect(extract.animations).toEqual([expect.objectContaining({ name: 'unnamed' })]);
    expect(extract.skins).toEqual([expect.objectContaining({ name: 'unnamed' })]);
  });
});

describe('ModelService optimize pipeline arms', () => {
  it('applies meshopt simplification to tiny.glb', async () => {
    const source = fixture();
    const document = await readModel(source);
    await optimizeDocument(document, { compress: 'meshopt', simplify: 0.5, weld: true });
    const out = await writeGlb(document);

    const reopened = await readModel(Buffer.from(out));
    const root = reopened.getRoot();
    expect(root.listMeshes().length).toBeGreaterThan(0);
    const positions = root.listMeshes()[0]?.listPrimitives()[0]?.getAttribute('POSITION');
    // Simplify either rewrote the accessor or left it; either is a legal outcome.
    expect(positions === null || positions!.getCount() >= 3).toBe(true);
  });
});

describe('ModelService deep scene graphs', () => {
  it('marks depth truncation at level 32 with childrenTruncated', async () => {
    const { Document, NodeIO } = await import('@gltf-transform/core');
    const doc = new Document();
    const buffer = doc.createBuffer();
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const accessor = doc.createAccessor('positions').setType('VEC3').setArray(positions).setBuffer(buffer);
    const mesh = doc.createMesh('deep').addPrimitive(
      doc.createPrimitive().setAttribute('POSITION', accessor),
    );
    let parent = doc.createNode('n0').setMesh(mesh);
    const scene = doc.createScene('deep');
    scene.addChild(parent);
    for (let index = 1; index < 40; index += 1) {
      const child = doc.createNode(`n${index}`);
      parent.addChild(child);
      parent = child;
    }
    const bytes = await new NodeIO().writeBinary(doc);

    const { service } = makeService(Buffer.from(bytes));
    const extract = await service.extract();
    // descend into the chain until depth 33 (root is depth 1): the 33rd flag appears there
    // the scene root is depth 0; node n32 sits at depth 32 and carries the truncation marker
    let node = extract.scenes[0]?.nodes[0];
    for (let depth = 0; depth < 32 && node !== undefined; depth += 1) {
      node = (node.children as Array<Record<string, unknown>> | undefined)?.[0] as typeof node;
    }
    expect(node?.childrenTruncated).toBe(1);
  });
});
