import { Demuxer } from 'node-av/api';
import { workerData } from 'node:worker_threads';

import { drainStream } from '@/utils/drain.js';

import type { VideoWorkerData } from '../type.js';

const data: VideoWorkerData = workerData;

/**
 *
 */
export async function metadata() {
  const input = await Demuxer.open(process.stdin as never, { format: data.inputFormat, options: { analyzeduration: 5_000_000, probesize: 5_000_000 } });
  try {
    process.stdout.write(
      `${JSON.stringify({
        duration: Number(input.duration),
        format: input.formatName,
        streams: input.streams.map((stream) => ({
          channels: stream.codecpar.channels,
          codec: stream.codecpar.codecId,
          height: stream.codecpar.height,
          index: stream.index,
          sampleRate: stream.codecpar.sampleRate,
          type: stream.codecpar.codecType,
          width: stream.codecpar.width,
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
 */
export async function stats() {
  const input = await Demuxer.open(process.stdin as never, { format: data.inputFormat, options: { analyzeduration: 5_000_000, probesize: 5_000_000 } });
  try {
    process.stdout.write(
      `${JSON.stringify({
        duration: Number(input.duration),
        format: input.formatName,
        streams: input.streams.map((stream) => ({
          bitrate: stream.codecpar.bitRate,
          codec: stream.codecpar.codecId,
          height: stream.codecpar.height,
          index: stream.index,
          type: stream.codecpar.codecType,
          width: stream.codecpar.width,
        })),
      }, (_k, v) => (typeof v === 'bigint' ? Number(v) : v))}\n`,
    );
  } finally {
    await drainStream(process.stdin);
    process.stdout.end();
    await input.close();
  }
}
