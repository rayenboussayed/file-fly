import { Demuxer, Muxer, pipeline } from 'node-av/api';
import { workerData } from 'node:worker_threads';

import type { VideoProcessorType } from './schema.js';
import type { VideoWorkerData } from './type.js';

const data = workerData as VideoWorkerData;
const inputFormat = data.inputFormat;
if (!inputFormat) { throw new Error('Unsupported input format'); }

/**
 *
 */
async function metadata() {
  const input = await Demuxer.open(process.stdin as never, { format: inputFormat });
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

/**
 *
 * @param payload
 */
/**
 * Process and remux the input stream to the requested output container.
 * @param payload Requested output settings.
 */
async function processMedia(payload: VideoProcessorType) {
  const format = payload.format?.trim() || 'mp4';
  const input = await Demuxer.open(process.stdin as never, { format: inputFormat });
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
  const input = await Demuxer.open(process.stdin as never, { format: inputFormat });
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

