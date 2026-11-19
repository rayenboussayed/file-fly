import type { Document, GLTF, JSONDocument, Primitive } from '@gltf-transform/core';

import {
  BadRequestException,
  Injectable,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import { superjson } from 'jutilities/json';
import { createHash } from 'node:crypto';

import { environment } from '@/environment.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { workerPath, WorkerService } from '@/services/worker.service.js';
import { bufferStream } from '@/utils/buffer.js';
import { openMediaSource } from '@/utils/open-source.js';

import { readModel, writeGlb, writeGltfJson } from './gltf.js';
import { MODEL_MIME, type ModelConvertType, type ModelOptimizeType } from './schema.js';

/**
 * Only the GLB container; .gltf JSON with external resources is out of scope.
 * @param cls - Normalized request context.
 * @returns The body bytes, capped.
 */
const readBody = async (cls: NormalizedClsService): Promise<Buffer> => {
  const contentType = String(cls.request()?.headers?.['content-type'] ?? '');
  const mime = contentType.split(';', 1)[0]?.trim() ?? '';
  if (mime !== MODEL_MIME && mime !== 'application/octet-stream') {
    throw new UnsupportedMediaTypeException(`Unsupported media type "${mime}" for GLB input`);
  }
  await openMediaSource(cls);
  const stream = cls.sourceStream().get();
  if (!stream) {
    throw new BadRequestException({ code: 'MODEL_NO_SOURCE', message: 'model body is missing' });
  }
  return bufferStream(stream, environment.CLAMAV_MAX_BYTES);
};

/**
 * Signature must be the GLB magic; closes the renamed-image and JSON-mislabeled holes.
 * @param buffer - The buffered upload.
 */
const assertModelSignature = async (buffer: Buffer): Promise<void> => {
  const signature = await fileTypeFromBuffer(buffer);
  if (signature?.mime !== MODEL_MIME) {
    throw new UnsupportedMediaTypeException('Uploaded bytes are not a GLB model');
  }
};

interface PrimitiveStats {
  triangles: number;
  vertices: number;
}

/**
 * Vertex and triangle totals for one primitive.
 * @param primitive - The primitive to measure.
 * @returns The vertex and triangle counts.
 */
/** glTF primitive mode constants. */
const MODE_TRIANGLES = 4;
const MODE_TRIANGLE_STRIP = 5;
const MODE_TRIANGLE_FAN = 6;

const primitiveStats = (primitive: Primitive): PrimitiveStats => {
  const positions = primitive.getAttribute('POSITION');
  const vertices = positions?.getCount() ?? 0;
  const indices = primitive.getIndices();
  const count = indices?.getCount() ?? vertices;
  const mode = primitive.getMode();
  if (mode === MODE_TRIANGLE_STRIP || mode === MODE_TRIANGLE_FAN) {
    // Strips and fans encode one triangle per vertex after the first two.
    return { triangles: Math.max(0, count - 2), vertices };
  }
  if (mode !== MODE_TRIANGLES) {
    // Points and lines are not triangles; counting them as such would lie.
    return { triangles: 0, vertices };
  }
  return { triangles: Math.floor(count / 3), vertices };
};

/**
 * Axis-aligned bounding box over every POSITION accessor, or undefined when nothing carries positions.
 * @param document - The parsed GLB document.
 * @returns The axis-aligned bounds, or undefined when no primitive carries positions.
 */
const boundsOf = (document: Document) => {
  const root = document.getRoot();
  const min: [number, number, number] = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  const max: [number, number, number] = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  let found = false;
  for (const mesh of root.listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      const positions = primitive.getAttribute('POSITION');
      if (!positions || positions.getCount() === 0) continue;
      // KHR_mesh_quantization accessors report quantized ints; use the dequantized bounds instead.
      const normalized = positions.getNormalized();
      const minTarget = normalized ? positions.getMinNormalized([0, 0, 0]) : positions.getMin([0, 0, 0]);
      const maxTarget = normalized ? positions.getMaxNormalized([0, 0, 0]) : positions.getMax([0, 0, 0]);
      found = true;
      // glTF POSITION accessors are VEC3; getMin/getMax return a 3-element target here.
      const [minX, minY, minZ] = minTarget as [number, number, number];
      const [maxX, maxY, maxZ] = maxTarget as [number, number, number];
      min[0] = Math.min(min[0], minX);
      min[1] = Math.min(min[1], minY);
      min[2] = Math.min(min[2], minZ);
      max[0] = Math.max(max[0], maxX);
      max[1] = Math.max(max[1], maxY);
      max[2] = Math.max(max[2], maxZ);
    }
  }
  if (!found) return undefined;
  return { max, min };
};

/**
 * Normalized metadata payload (used by the metadata route).
 * @param document - The parsed GLB document.
 * @returns The normalized metadata payload.
 */
const metadataOf = (document: Document) => {
  const root = document.getRoot();
  const asset = root.getAsset();
  const counts = { accessors: 0, animations: 0, cameras: 0, materials: 0, meshes: 0, nodes: 0, primitives: 0, scenes: 0, skins: 0, textures: 0, triangles: 0, vertices: 0 };
  for (const mesh of root.listMeshes()) {
    counts.meshes += 1;
    for (const primitive of mesh.listPrimitives()) {
      counts.primitives += 1;
      const stats = primitiveStats(primitive);
      counts.triangles += stats.triangles;
      counts.vertices += stats.vertices;
    }
  }
  counts.accessors = root.listAccessors().length;
  counts.animations = root.listAnimations().length;
  counts.cameras = root.listCameras().length;
  counts.materials = root.listMaterials().length;
  counts.nodes = root.listNodes().length;
  counts.scenes = root.listScenes().length;
  counts.skins = root.listSkins().length;
  counts.textures = root.listTextures().length;
  return {
    asset: { generator: asset.generator, version: asset.version },
    bounds: boundsOf(document),
    counts,
    extensionsRequired: root.listExtensionsRequired().map((extension) => extension.extensionName),
    extensionsUsed: root.listExtensionsUsed().map((extension) => extension.extensionName),
    format: 'model',
  };
};

/**
 * Structural extraction payload (used by the extract route).
 * @param document - The parsed GLB document.
 * @returns The structural extraction payload.
 */
const extractOf = (document: Document) => {
  const root = document.getRoot();
  // A crafted GLB may reference the same node from many children arrays; the JSON output would explode.
  const MAX_EMITTED_NODES = 10_000;
  let emittedNodes = 0;
  type Node = ReturnType<typeof root.listNodes>[number];
  const walk = (current: Node, depth: number): Record<string, unknown> => {
    emittedNodes += 1;
    if (emittedNodes > MAX_EMITTED_NODES) {
      throw new BadRequestException({
        code: 'MODEL_TOO_COMPLEX',
        message: `the scene expands to more than ${MAX_EMITTED_NODES} nodes`,
      });
    }
    return {
      name: current.getName() || 'unnamed',
      ...(current.getMesh() ? { mesh: current.getMesh()?.getName() } : {}),
      rotation: current.getRotation(),
      scale: current.getScale(),
      translation: current.getTranslation(),
      ...walkChildren(current, depth),
    };
  };
  const walkChildren = (current: Node, depth: number): Record<string, unknown> => {
    const children = current.listChildren();
    if (children.length === 0) return {};
    if (depth < 32) return { children: children.map((child) => walk(child, depth + 1)) };
    return { childrenTruncated: children.length };
  };

  const sceneTree = root.listScenes().map((scene) => ({
    name: scene.getName() || 'unnamed',
    nodes: scene.listChildren().map((node) => walk(node, 0)),
  }));
  // Sibling arrays are capped for the same reason as the 10k node fan-out cap: a
  // pathological (but signature-valid) model could carry tens of thousands of primitives.
  const ARRAY_CAP = 10_000;
  const meshes = root.listMeshes().slice(0, ARRAY_CAP).map((mesh) => ({
    name: mesh.getName() || 'unnamed',
    primitives: mesh.listPrimitives().map((primitive) => ({
      attributes: primitive.listSemantics(),
      material: primitive.getMaterial()?.getName(),
      mode: primitive.getMode(),
      targets: primitive.listTargets().length,
      ...primitiveStats(primitive),
    })),
  }));
  const materials = root.listMaterials().slice(0, ARRAY_CAP).map((material) => ({
    alphaMode: material.getAlphaMode(),
    baseColorFactor: material.getBaseColorFactor(),
    doubleSided: material.getDoubleSided(),
    emissiveFactor: material.getEmissiveFactor(),
    metallicFactor: material.getMetallicFactor(),
    name: material.getName() || 'unnamed',
    roughnessFactor: material.getRoughnessFactor(),
  }));
  const textures = root.listTextures().slice(0, ARRAY_CAP).map((texture) => {
    const image = texture.getImage();
    return {
      bytes: image?.byteLength ?? 0,
      mimeType: texture.getMimeType(),
      name: texture.getName() || 'unnamed',
    };
  });
  const animations = root.listAnimations().slice(0, ARRAY_CAP).map((animation) => ({
    channels: animation.listChannels().length,
    name: animation.getName() || 'unnamed',
    samplers: animation.listSamplers().length,
  }));
  const skins = root.listSkins().slice(0, ARRAY_CAP).map((skin) => ({
    joints: skin.listJoints().length,
    name: skin.getName() || 'unnamed',
  }));
  return {
    animations,
    format: 'model',
    materials,
    meshes,
    scenes: sceneTree,
    skins,
    textures,
  };
};

/** Model feature service: glTF/GLB inspection, extraction, optimization (DRACO/Meshopt) and conversion. */
@Injectable()
export class ModelService {
  constructor(
    private readonly cls: NormalizedClsService,
    private readonly workerService: WorkerService,
  ) {}

  /**
   * Converts the uploaded GLB between container formats.
   * `glb`: binary container (lossless round-trip). `gltf`: self-contained JSON with data URIs.
   * @param query - Target container.
   * @returns The converted bytes.
   */
  async convert(query: ModelConvertType): Promise<Buffer> {
    const buffer = await readBody(this.cls);
    await assertModelSignature(buffer);
    const document = await readModel(buffer);
    if (query.to === 'glb') {
      return Buffer.from(await writeGlb(document));
    }
    const { json, resources } = await writeGltfJson(document);
    inlineResources(json, resources);
    return Buffer.from(JSON.stringify(json), 'utf8');
  }

  /**
   * Extracts the scene graph, meshes, materials, textures, animations and skins.
   * @returns The structural extraction of the model.
   */
  async extract() {
    const buffer = await readBody(this.cls);
    await assertModelSignature(buffer);
    const document = await readModel(buffer);
    return extractOf(document);
  }

  /**
   * Normalized GLB metadata for an uploaded model.
   * @returns Format, asset descriptor, counts, extensions and bounds.
   */
  async metadata() {
    const buffer = await readBody(this.cls);
    await assertModelSignature(buffer);
    const document = await readModel(buffer);
    return metadataOf(document);
  }

  /**
   * Optimizes the uploaded model in a worker thread and returns GLB bytes.
   * @param query - Compression codec, simplification ratio and weld.
   * @returns The optimized GLB bytes.
   */
  async optimize(query: ModelOptimizeType): Promise<Buffer> {
    const buffer = await readBody(this.cls);
    await assertModelSignature(buffer);
    // Parse gate: corrupt-but-signed input returns 400 deterministically here (rather than
    // relying on the worker failing into a destroyed stream and a 500). The worker re-parses;
    // the double parse costs ~10% of optimize time and buys the honest 400.
    await readModel(buffer);
    // Content-addressed cache key: sha256 of the GLB + the optimize options. Repeated
    // identical optimizes are served/deduplicated from the worker cache/inflight map,
    // and no binary bytes land in the key itself (only the digest does).
    this.cls.cacheKey().set(
      `${createHash('sha256').update(buffer).digest('hex')}:${superjson.stringify(query)}`,
    );
    const stream = await this.workerService.createWorker(workerPath('./worker/index.js', import.meta.url), {
      workerData: {
        operation: 'optimize',
        payload: { buffer, query },
      },
    });
    const bytes = await bufferStream(stream, environment.CLAMAV_MAX_BYTES);
    if (bytes.length === 0 || bytes.subarray(0, 4).toString('latin1') !== 'glTF') {
      // The worker already validated the document by re-reading it; the magic check is the cheap belt-and-braces.
      const wrapped = new Error('model optimize produced an invalid document');
      (wrapped as Error & { cause?: unknown }).cause = new Error('optimizer output failed the GLB magic check');
      throw wrapped;
    }
    return bytes;
  }
}

/**
 * Rewrites resource URIs to data URIs so the .gltf is a single self-contained file.
 * @param uri - The resource URI.
 * @returns The best-known MIME type for the resource.
 */
const mimeFor = (uri: string): string => {
  if (uri.endsWith('.ktx2') || uri.endsWith('.ktx')) return 'image/ktx2';
  if (uri.endsWith('.avif')) return 'image/avif';
  if (uri.endsWith('.gif')) return 'image/gif';
  if (uri.endsWith('.png')) return 'image/png';
  if (uri.endsWith('.jpg') || uri.endsWith('.jpeg')) return 'image/jpeg';
  if (uri.endsWith('.webp')) return 'image/webp';
  if (uri.endsWith('.bin')) return 'application/octet-stream';
  return 'application/octet-stream';
};

/**
 * Rewrites resource URIs to data URIs so the .gltf is a single self-contained file.
 * @param json - The glTF JSON document to rewrite in place.
 * @param resources - The resource map from writeJSON.
 */
const inlineResources = (json: GLTF.IGLTF, resources: JSONDocument['resources']): void => {
  const inline = (parent: unknown): void => {
    if (Array.isArray(parent)) {
      for (const item of parent) inline(item);
      return;
    }
    if (parent === null || typeof parent !== 'object') return;
    // The JSON tree produced by JSON.parse / writeJSON is plain records and arrays.
    const record = parent as Record<string, unknown>;
    const uri = record['uri'];
    if (typeof uri === 'string' && Object.prototype.hasOwnProperty.call(resources, uri)) {
      // hasOwnProperty keeps prototype-named URIs (constructor etc.) from matching.
      // eslint-disable-next-line security/detect-object-injection
      const bytes = resources[uri];
      if (bytes) {
        record['uri'] = `data:${mimeFor(uri)};base64,${Buffer.from(bytes).toString('base64')}`;
        if ('byteLength' in record) record['byteLength'] = bytes.length;
      }
    }
    for (const value of Object.values(record)) inline(value);
  };
  inline(json);
};
