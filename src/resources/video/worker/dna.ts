import { Decoder, Demuxer, FilterAPI } from 'node-av/api';
import { workerData } from 'node:worker_threads';
import sharp from 'sharp';

import { drainStream } from '@/utils/drain.js';
import { loadPdq } from '@/utils/pdq.js';
import { NODE_AV_VERSION, PDQ_WASM_VERSION, SHARP_VERSION } from '@/utils/versions.js';

import type { VideoWorkerData } from '../type.js';

const data: VideoWorkerData = workerData;

/**
 * Computes a sequence of PDQ perceptual hashes for the video on stdin,
 * sampled at 2 fps and normalized to 512px-wide RGB frames.
 *
 * The decoder runs to EOF so stdin is usually fully consumed, but the
 * remainder is still drained in the `finally` block: on early failure
 * (e.g. no video stream) the unread HTTP upload must be discarded or
 * the client stalls mid-send.
 * @returns Resolves after the DNA JSON line is written to stdout.
 */
export async function dna(): Promise<void> {
  await using input = await Demuxer.open(process.stdin, { format: data.inputFormat, options: { analyzeduration: 5_000_000, probesize: 5_000_000 } });
  try {
    const stream = input.video();
    if (!stream) {
      throw new Error('NO_VIDEO_STREAM');
    }
    using decoder = await Decoder.create(stream);
    using filter = FilterAPI.create('fps=2,scale=512:-2:flags=bilinear,format=rgb24');
    const pdq = await loadPdq();
    const frames: Array<{ hash: string; quality: number; t: number }> = [];
    let n = 0;
    for await (const frame of filter.frames(decoder.frames(input.packets(stream.index)))) {
      if (!frame) {
        continue;
      }
      try {
        const rgb: Buffer = frame.toBuffer();
        const w = frame.width;
        const h = frame.height;
        let bytes: Buffer = rgb;
        let width = w;
        let height = h;
        const trimmed = await sharp(rgb, { raw: { channels: 3, height: h, width: w } }).trim({ threshold: 12 }).raw().toBuffer({ resolveWithObject: true }).catch(() => null);
        if (trimmed && trimmed.info.width >= 64 && trimmed.info.height >= 64) {
          bytes = trimmed.data;
          width = trimmed.info.width;
          height = trimmed.info.height;
        }
        const res = pdq.hash({ channels: 3, data: new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.length), height, width });
        frames.push({ hash: pdq.toHex(res.hash), quality: res.quality, t: n / 2 });
        n += 1;
      } finally {
        frame.free();
      }
    }
    process.stdout.write(`${JSON.stringify({ algorithm: 'vid-pdq', count: frames.length, env: { nodeAv: NODE_AV_VERSION, pdqWasm: PDQ_WASM_VERSION, sharp: SHARP_VERSION }, fps: 2, frames, version: 'vid-pdq2fps@1' })}\n`);
  } finally {
    await drainStream(process.stdin);
    process.stdout.end();
  }
}
