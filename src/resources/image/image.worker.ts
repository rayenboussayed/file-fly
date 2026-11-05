import { workerData } from 'node:worker_threads';
import sharp from 'sharp';
import { pipeline } from 'stream/promises';

import { ImageProcessorType } from './schema.js';
import { ImageWorkerData } from './type.js';

export type ImageMetadata = Awaited<ReturnType<typeof metadata>>;
export type ImageStats = Awaited<ReturnType<typeof stats>>;

class Processor {
  buildTransformer(payload: ImageProcessorType) {
    let transformer = sharp();
    transformer = transformer.resize({
      background: payload.background,
      fit: payload.fit,
      height: payload.height,
      kernel: payload.kernel,
      position: payload.position,
      width: payload.width,
      withoutEnlargement: payload.withoutEnlargement,
      withoutReduction: payload.withoutReduction,
    });
    if (payload.format) {
      transformer = transformer.toFormat(payload.format, {
        force: true,
        minSize: true,
        optimiseCoding: true,
        optimiseScans: true,
        quality: payload.quality,
        smartDeblock: true,
        smartSubsample: true,
      });
    }
    if (payload.blur) transformer = transformer.blur(payload.blur);
    if (payload.flip) transformer = transformer.flip();
    if (payload.flop) transformer = transformer.flop();
    if (payload.greyscale) transformer = transformer.greyscale();
    if (payload.median) transformer = transformer.median(payload.median);
    if (payload.negate) transformer = transformer.negate();
    if (payload.normalize) transformer = transformer.normalize();
    if (payload.rotate) transformer = transformer.rotate(payload.rotate);
    if (payload.sharpen)
      transformer = transformer.sharpen({ sigma: payload.sharpen });
    if (payload.threshold)
      transformer = transformer.threshold(payload.threshold);
    if (payload.tint) transformer = transformer.tint(payload.tint);
    if (payload.trim) transformer = transformer.trim();

    return transformer;
  }

  process(payload: ImageProcessorType) {
    const transformer = this.buildTransformer(payload);
    void pipeline(process.stdin, transformer, process.stdout);
  }
}

/**
 *
 */
async function metadata() {
  const transformer = sharp();
  const metadataPromise = transformer.metadata();

  const pipePromise = pipeline(process.stdin, transformer, process.stdout);
  transformer.resume();

  const metadata = await pipePromise.then(() => metadataPromise);
  process.stdout.end(JSON.stringify(metadata));
}

/**
 *
 */
async function stats() {
  const transformer = sharp();
  const statsPromise = transformer.stats();

  const pipePromise = pipeline(process.stdin, transformer, process.stdout);
  transformer.resume();

  const stats = await pipePromise.then(() => statsPromise);
  process.stdout.end(JSON.stringify(stats));
}

const data = workerData as ImageWorkerData;
switch (data.operation) {
  case 'metadata':
    metadata();
    break;
  case 'processor':
    new Processor().process(data.payload);
    break;
  case 'stats':
    stats();
    break;
}
