import { Demuxer, Muxer, pipeline } from 'node-av/api';
import type { DemuxerFormat } from 'node-av/constants';
import { workerData } from 'node:worker_threads';

import type { AudioProcessorType } from './schema.js';
import type { AudioWorkerData } from './type.js';

const data = workerData as AudioWorkerData;
const inputFormat = data.inputFormat;
if (!inputFormat) { throw new Error('Unsupported input format'); }

/**
 *
 */
async function metadata() {
  const input = await Demuxer.open(process.stdin, { format: inputFormat as DemuxerFormat });
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

/**
 * Process and remux the input stream to the requested output container.
 * @param payload Requested output settings.
 */
async function processMedia(payload: AudioProcessorType) {
  const format = payload.format?.trim() || 'mp3';
  const input = await Demuxer.open(process.stdin, { format: inputFormat as DemuxerFormat });
  const output = await Muxer.open('/dev/stdout', { format });
  const control = pipeline(input, output);
  await control.completion;
  await input.close();
  await output.close();
}

/**
 *
 */
async function stats() {
  const input = await Demuxer.open(process.stdin, { format: inputFormat as DemuxerFormat });
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

