import { workerData } from 'node:worker_threads';

import { Demuxer, Muxer, pipeline } from 'node-av/api';

import type { AudioProcessorType } from './schema.js';
import type { AudioWorkerData } from './type.js';

async function metadata() {
  const input = await Demuxer.open('/dev/stdin');
  const streams = input.streams.map((stream) => ({
    channels: stream.codecpar.channels,
    codec: stream.codecpar.codecId,
    index: stream.index,
    sampleRate: stream.codecpar.sampleRate,
    type: stream.codecpar.codecType,
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
    channels: stream.codecpar.channels,
    codec: stream.codecpar.codecId,
    index: stream.index,
    sampleRate: stream.codecpar.sampleRate,
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

async function processMedia(payload: AudioProcessorType) {
  const format = payload.format?.trim() || 'mp3';
  const input = await Demuxer.open('/dev/stdin');
  const output = await Muxer.open('/dev/stdout', { format });
  const control = pipeline(input, output);
  await control.completion;
  await input.close();
  await output.close();
}

const data = workerData as AudioWorkerData;
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

