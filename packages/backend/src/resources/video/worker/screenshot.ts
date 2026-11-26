import { Decoder, Demuxer, Scaler } from 'node-av/api';
import { AVSEEK_FLAG_BACKWARD } from 'node-av/constants';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline as streamPipeline } from 'node:stream/promises';
import { workerData } from 'node:worker_threads';

import { CACHE_DIR } from '@/constants/fs.js';

import type { VideoWorkerData } from '../type.js';

import { createWorkerLogger } from '../../../logging/worker-logger.js';
import { screenshotBoundary, writePartHeader, writeTerminator } from '../multipart.js';

const logger = createWorkerLogger();

const data: VideoWorkerData = workerData;

/**
 * Returns the first usable frame of a decoded video as JPEG.
 * @param decoder - Decoder bound to the video stream.
 * @param input - Demuxer supplying the packets to decode.
 * @param scaler - Scaler used to convert the frame to JPEG.
 * @returns The first decoded frame as JPEG, or undefined when none decoded.
 */
const firstJpeg = async (
  decoder: Decoder,
  input: Demuxer,
  scaler: Scaler,
): Promise<Buffer | undefined> => {
  for await (const frame of decoder.frames(input.packets())) {
    if (frame) return scaler.toJpeg(frame);
  }
  return undefined;
};

/**
 * Extracts one JPEG frame per requested timestamp as a multipart/mixed stream.
 * @param frames - Requested timestamps in seconds (sorted, deduplicated).
 */
export async function screenshot(frames: number[]) {
  const temporary = path.join(CACHE_DIR, `${randomUUID()}.tmp`);
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await streamPipeline(process.stdin, fs.createWriteStream(temporary, { mode: 0o600 }));

    const probe = await Demuxer.open(temporary, { format: data.inputFormat });
    const duration = probe.duration;
    await probe.close();

    if (frames.length === 0) throw new Error('No frames requested');

    const boundary = screenshotBoundary(frames);
    let written = 0;
    using scaler = new Scaler();

    for (const requested of frames) {
      const target = Math.min(requested, Math.max(duration - 0.001, 0));
      try {
        await using input = await Demuxer.open(temporary, { format: data.inputFormat });
        const stream = input.video();
        if (!stream) throw new Error('No video stream');
        await input.seek(target, -1, AVSEEK_FLAG_BACKWARD);
        using decoder = await Decoder.create(stream);

        const jpeg = await firstJpeg(decoder, input, scaler);

        if (jpeg) {
          process.stdout.write(writePartHeader(written, target, jpeg.length, boundary));
          process.stdout.write(jpeg);
          written += 1;
        }
      } catch (error) {
        logger.warn({ err: error, frame: requested }, 'screenshot frame failed');
      }
    }

    if (written === 0) throw new Error('No frames could be decoded');
    process.stdout.write(writeTerminator(boundary));
  } finally {
    process.stdout.end();
    try {
      await fs.promises.rm(temporary, { force: true });
    } catch {
      // best-effort cleanup
      void 0;
    }
  }
}
