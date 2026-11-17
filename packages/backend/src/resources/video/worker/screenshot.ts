import { Decoder, Demuxer, Scaler } from 'node-av/api';
import { AVSEEK_FLAG_BACKWARD } from 'node-av/constants';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { workerData } from 'node:worker_threads';
import { pipeline as streamPipeline } from 'stream/promises';

import { CACHE_DIR } from '@/constants/fs.js';

import type { VideoWorkerData } from '../type.js';

import { screenshotBoundary, writePartHeader, writeTerminator } from '../multipart.js';

const data: VideoWorkerData = workerData;

/**
 * Extracts one JPEG frame per requested timestamp as a multipart/mixed stream.
 * @param frames - Requested timestamps in seconds (sorted, deduplicated).
 */
export async function screenshot(frames: number[]) {
  const tmp = path.join(CACHE_DIR, `${randomUUID()}.tmp`);
  try {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    await streamPipeline(process.stdin, fs.createWriteStream(tmp));

    const probe = await Demuxer.open(tmp, { format: data.inputFormat });
    const duration = probe.duration;
    await probe.close();

    if (frames.length === 0) throw new Error('No frames requested');

    const boundary = screenshotBoundary(frames);
    let written = 0;
    using scaler = new Scaler();

    for (const requested of frames) {
      const target = Math.min(requested, Math.max(duration - 0.001, 0));
      try {
        await using input = await Demuxer.open(tmp, { format: data.inputFormat });
        const stream = input.video();
        if (!stream) throw new Error('No video stream');
        await input.seek(target, -1, AVSEEK_FLAG_BACKWARD);
        using decoder = await Decoder.create(stream);

        let jpeg: Buffer | undefined;
        for await (const frame of decoder.frames(input.packets())) {
          if (frame) {
            jpeg = await scaler.toJpeg(frame);
            break;
          }
        }

        if (jpeg) {
          process.stdout.write(writePartHeader(written, target, jpeg.length, boundary));
          process.stdout.write(jpeg);
          written += 1;
        }
      } catch (error) {
        console.warn(`screenshot frame ${requested} failed:`, error);
      }
    }

    if (written === 0) throw new Error('No frames could be decoded');
    process.stdout.write(writeTerminator(boundary));
  } finally {
    process.stdout.end();
    await fs.promises.rm(tmp, { force: true }).catch(() => undefined);
  }
}
