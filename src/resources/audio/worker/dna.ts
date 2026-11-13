import { Decoder, Demuxer, Encoder, FilterAPI, Muxer } from 'node-av/api';
import { FF_ENCODER_PCM_S16LE } from 'node-av/constants';
import { workerData } from 'node:worker_threads';

import { drainStream } from '@/utils/drain.js';
import { NODE_AV_VERSION } from '@/utils/versions.js';

import type { AudioWorkerData } from '../type.js';

const data: AudioWorkerData = workerData;

/**
 * Computes the Chromaprint fingerprint for the audio on stdin.
 *
 * Unexpected errors are not handled here; worker/index owns failure paths.
 * @param inputData - Worker input with demuxer format.
 * @returns Resolves after the fingerprint JSON is written to stdout.
 */
export async function dna(inputData: AudioWorkerData = data): Promise<void> {
  const chunks: Buffer[] = [];
  await using input = await Demuxer.open(process.stdin, {
    format: inputData.inputFormat,
    options: { analyzeduration: 5_000_000, probesize: 5_000_000 },
  });
  try {
    const stream = input.audio();
    if (!stream) {
      throw new Error('NO_AUDIO_STREAM');
    }
    await using decoder = await Decoder.create(stream);
    const filter = FilterAPI.create('aformat=sample_fmts=s16');
    const encoder = await Encoder.create(FF_ENCODER_PCM_S16LE, {
      autoResample: true,
    });
    const muxer = await Muxer.open(
      {
        write: (b: Buffer) => {
          chunks.push(Buffer.from(b));
          return b.length;
        },
      },
      { format: 'chromaprint', options: { algorithm: 1, fp_format: 'raw' } },
    );
    let idx = -1;
    for await (const p of encoder.packets(
      filter.frames(decoder.frames(input.packets(stream.index))),
    )) {
      if (!p) {
        continue;
      }
      try {
        if (idx < 0) {
          idx = muxer.addStream(encoder);
        }
        await muxer.writePacket(p, idx);
      } finally {
        p.free();
      }
    }
    await muxer.close();
    const raw = Buffer.concat(chunks);
    process.stdout.write(
      `${JSON.stringify({ algorithm: 'chromaprint', env: { nodeAv: NODE_AV_VERSION }, hash: raw.toString('base64'), length: raw.length / 4, version: 'chromaprint@1' })}\n`,
    );
  } finally {
    await drainStream(process.stdin);
    process.stdout.end();
  }
}
