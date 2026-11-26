import { type Document, type GLTF, type JSONDocument, Logger, NodeIO, Verbosity } from '@gltf-transform/core';
// ALL_EXTENSIONS covers draco, meshopt, basisu, WebP/AVIF, GPU instancing and structural metadata.
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, draco, meshopt, prune, simplify, weld } from '@gltf-transform/functions';
import { BadRequestException } from '@nestjs/common';
import draco3d from 'draco3dgltf';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

/**
Structured output of writeJSON: the glTF JSON document plus a map of resource URIs to bytes.
 */
interface GltfJsonOutput {
  json: GLTF.IGLTF;
  resources: JSONDocument['resources'];
}

type IO = InstanceType<typeof NodeIO>;

/**
Lazily-built NodeIO with meshopt and draco registered; wasm modules are created once per process.
 */
const ioCache: { promise?: Promise<IO> } = {};

const ioOf = async (): Promise<IO> => {
  const cached = ioCache.promise;
  if (cached !== undefined) return cached;
  const created = (async () => {
    await MeshoptDecoder.ready;
    await MeshoptEncoder.ready;
    await MeshoptSimplifier.ready;
    return new NodeIO()
      // stdout is the binary channel in the worker; the default console logger would corrupt it.
      // ALL_EXTENSIONS covers draco, meshopt, basisu, WebP/AVIF, instancing and structural metadata.
      .setLogger(new Logger(Verbosity.SILENT))
      .registerExtensions([...ALL_EXTENSIONS])
      .registerDependencies({
        'draco3d.decoder': await draco3d.createDecoderModule(),
        'draco3d.encoder': await draco3d.createEncoderModule(),
        'meshopt.decoder': MeshoptDecoder,
        'meshopt.encoder': MeshoptEncoder,
      });
  })();
  ioCache.promise = created;
  return created;
};

/**
 * Opens a GLB work package; a single corrupt byte answers 400.
 * @param buffer - The uploaded GLB bytes.
 * @returns The parsed gltf-transform document.
 */
export const readModel = async (buffer: Buffer): Promise<Document> => {
  const io = await ioOf();
  try {
    // View, not copy: gltf-transform only reads the bytes.
    return await io.readBinary(new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength));
  } catch {
    throw new BadRequestException({ code: 'MODEL_UNREADABLE', message: 'the uploaded bytes are not a readable GLB' });
  }
};

/**
 * Serializes a document to GLB bytes.
 * @param document - The document to serialize.
 * @returns The GLB bytes.
 */
export const writeGlb = async (document: Document): Promise<Uint8Array> => {
  const io = await ioOf();
  return io.writeBinary(document);
};

/**
 * Converts a document to the glTF JSON document plus its resources.
 * @param document - The document to convert.
 * @returns The JSON document and the resource map.
 */
export const writeGltfJson = async (document: Document): Promise<GltfJsonOutput> => {
  const io = await ioOf();
  const { json, resources } = await io.writeJSON(document);
  return { json, resources };
};

/**
 * Runs the optimize pipeline in the caller (used by the worker, where transforms are safe).
 * @param document - The document to optimize (already opened via {@link readModel}).
 * @param options - Compression codec, simplification ratio and weld.
 * @param options.compress - The compression codec ('meshopt', 'draco' or 'none').
 * @param options.simplify - The simplification ratio in [0, 1]; 1 disables it.
 * @param options.weld - Whether to weld bitwise-identical vertices.
 */
export const optimizeDocument = async (
  document: Document,
  options: { compress: 'draco' | 'meshopt' | 'none'; simplify: number; weld: boolean },
): Promise<void> => {
  const pipeline = [dedup(), prune()];
  if (options.weld || options.simplify < 1) {
    pipeline.push(weld());
  }
  if (options.simplify < 1) {
    pipeline.push(simplify({ error: 0.001, ratio: options.simplify, simplifier: MeshoptSimplifier }));
  }
  if (options.compress === 'meshopt') {
    pipeline.push(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  } else if (options.compress === 'draco') {
    pipeline.push(
      draco({ decodeSpeed: 5, encodeSpeed: 5, method: 'edgebreaker', quantizeGeneric: 12, quantizeNormal: 10, quantizePosition: 14, quantizeTexcoord: 12 }),
    );
  }
  await document.transform(...pipeline);
};
