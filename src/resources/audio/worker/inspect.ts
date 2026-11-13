import { Demuxer } from 'node-av/api';
import { workerData } from 'node:worker_threads';

import { drainStream } from '@/utils/drain.js';

import type { AudioWorkerData } from '../type.js';

const data: AudioWorkerData = workerData;

/**
 *
// eslint-disable-next-line jsdoc/require-param-description
 * @param inputData Description.
 */
export async function metadata(inputData: AudioWorkerData = data) {
  const input = await Demuxer.open(process.stdin as never, { format: inputData.inputFormat, options: { analyzeduration: 5_000_000, probesize: 5_000_000 } });
  try {
    process.stdout.write(
      `${JSON.stringify({
        duration: Number(input.duration),
        format: input.formatName,
        streams: input.streams.map((stream) => ({
          channels: stream.codecpar.channels,
          codec: stream.codecpar.codecId,
          index: stream.index,
          sampleRate: stream.codecpar.sampleRate,
          type: stream.codecpar.codecType,
        })),
      }, (_k, v) => (typeof v === 'bigint' ? Number(v) : v))}\n`,
    );
  } finally {
    await drainStream(process.stdin);
    process.stdout.end();
    await input.close();
  }
}

/**
 *
// eslint-disable-next-line jsdoc/require-param-description
 * @param inputData Description.
 */
export async function stats(inputData: AudioWorkerData = data) {
  const input = await Demuxer.open(process.stdin as never, { format: inputData.inputFormat, options: { analyzeduration: 5_000_000, probesize: 5_000_000 } });
  try {
    process.stdout.write(
      `${JSON.stringify({
        duration: Number(input.duration),
        format: input.formatName,
        streams: input.streams.map((stream) => ({
          bitrate: stream.codecpar.bitRate,
          channels: stream.codecpar.channels,
          codec: stream.codecpar.codecId,
          index: stream.index,
          sampleRate: stream.codecpar.sampleRate,
        })),
      }, (_k, v) => (typeof v === 'bigint' ? Number(v) : v))}\n`,
    );
  } finally {
    await drainStream(process.stdin);
    process.stdout.end();
    await input.close();
  }
}
