import { pipeline } from 'node:stream/promises';
import sharp from 'sharp';

import type { ImageProcessorType } from '../schema.js';

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

  async process(payload: ImageProcessorType): Promise<void> {
    const transformer = this.buildTransformer(payload);
    await pipeline(process.stdin, transformer, process.stdout);
  }
}

export { Processor };
