import { Decoder, Demuxer, Encoder, Muxer, pipeline } from 'node-av/api';
import { workerData } from 'node:worker_threads';

import type { MuxerFormat } from '@/constants/av-formats.js';

import { isAllowedOutputFormat, MP4_FRAGMENTED_OPTIONS } from '@/utils/capabilities.js';

import type { AudioProcessorType } from '../schema.js';
import type { AudioWorkerData } from '../type.js';

import { codecFor } from './codecs.js';
import { buildFilters } from './filters.js';

const data: AudioWorkerData = workerData;

/**
 *
 * @param payload Output settings.
// eslint-disable-next-line jsdoc/require-param-description
 * @param inputData Description.
 */
export async function processMedia(payload: AudioProcessorType, inputData: AudioWorkerData = data) {
  const format = payload.format ?? 'mp3';
  if (!isAllowedOutputFormat(format)) {
    throw new Error(`Streaming output does not support format: ${format}`);
  }

  const transcodings = [
    payload.bitrate,
    payload.channels,
    payload.codec,
    payload.compress,
    payload.denoise,
    payload.fadeIn,
    payload.fadeOut,
    payload.gain,
    payload.normalize,
    payload.sampleRate,
    payload.speed,
    payload.trimEnd,
    payload.trimStart,
  ].some(Boolean);

  await using input = await Demuxer.open(process.stdin as never, {
    format: inputData.inputFormat,
    options: { analyzeduration: 5_000_000, probesize: 5_000_000 },
  });

  await using output = await Muxer.open(process.stdout, {
    format: format as MuxerFormat,
    options: format === 'mp4' ? { movflags: MP4_FRAGMENTED_OPTIONS.movflags } : undefined,
  });

  const stream = input.audio();
  if (!stream && transcodings) {
    throw new Error('Audio processing requires an audio stream');
  }

  if (!transcodings || !stream) {
    const control = pipeline(input, output);
    await control.completion;
    return;
  }

  using decoder = await Decoder.create(stream);
  const filters = buildFilters(payload);
  const bitrate: string = payload.bitrate ?? (format === 'ogg' ? '96k' : '128k');

  using encoder = await Encoder.create(codecFor(format, payload.codec), {
    autoResample: true,
    context: { bitRate: bitrate },
    decoder,
  });

  const control = pipeline(input, decoder, filters, encoder, output);
  await control.completion;
}
