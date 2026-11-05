import { workerData } from 'node:worker_threads';

import { Demuxer, Muxer, pipeline } from 'node-av/api';

import type { VideoProcessorType } from './schema.js';
import type { VideoWorkerData } from './type.js';

async function metadata() {
  const input = await Demuxer.open('/dev/stdin');
  const streams = input.streams.map((stream) => ({
    channels: stream.codecpar.channels,
    codec: stream.codecpar.codecId,
    height: stream.codecpar.height,
    index: stream.index,
    sampleRate: stream.codecpar.sampleRate,
    type: stream.codecpar.codecType,
    width: stream.codecpar.width,
  }));
  process.stdout.write(
    JSON.stringify({
      duration: input.duration,
      format: input.formatName,
      streams,
    }),
  );
  process.stdout.end();
  await input.close();
}

async function stats() {
  const input = await Demuxer.open('/dev/stdin');
  const streams = input.streams.map((stream) => ({
    bitrate: stream.codecpar.bitRate,
    codec: stream.codecpar.codecId,
    height: stream.codecpar.height,
    index: stream.index,
    type: stream.codecpar.codecType,
    width: stream.codecpar.width,
  }));
  process.stdout.write(
    JSON.stringify({
      duration: input.duration,
      format: input.formatName,
      streams,
    }),
  );
  process.stdout.end();
  await input.close();
}

async function processMedia(payload: VideoProcessorType) {
  const format = payload.format?.trim() || 'mp4';
  const input = await Demuxer.open('/dev/stdin');
  const output = await Muxer.open('/dev/stdout', { format });
  const control = pipeline(input, output);
  await control.completion;
  await input.close();
  await output.close();
}

const data = workerData as VideoWorkerData;
switch (data.operation) {
  case 'metadata':
    void metadata();
    break;
  case 'processor':
    void processMedia(data.payload);
    break;
  case 'stats':
    void stats();
    break;
}

