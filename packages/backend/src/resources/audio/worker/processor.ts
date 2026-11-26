import { Decoder, Demuxer, Encoder, FilterAPI, Muxer, pipeline } from 'node-av/api';
import { FF_ENCODER_LIBOPUS } from 'node-av/constants';
import { workerData } from 'node:worker_threads';

import type { MuxerFormat } from '@/constants/av-formats.js';

import { isAllowedOutputFormat, MP4_FRAGMENTED_OPTIONS } from '@/utils/capabilities.js';

import type { AudioProcessorType } from '../schema.js';
import type { AudioWorkerData } from '../type.js';

import { codecFor } from './codecs.js';
import { buildFilters } from './filters.js';

const data: AudioWorkerData = workerData;

/**
 * Transcodes the upload stdin into the requested format/codec/bitrate and streams it out.
 * @param payload - Output settings from the request query.
 * @param inputData - Worker dispatch data (defaults to the spawned worker's workerData).
 */
export async function processMedia(payload: AudioProcessorType, inputData: AudioWorkerData = data) {
  const format = payload.format ?? 'mp3';
  if (!isAllowedOutputFormat(format)) {
    throw new Error(`Streaming output does not support format: ${format}`);
  }

  const isTranscodings = [
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

  // node-av tolerates the socket as a Readable; stdin is always piped in the worker.
  await using input = await Demuxer.open(process.stdin as never, {
    format: inputData.inputFormat,
    options: { analyzeduration: 5_000_000, probesize: 5_000_000 },
  });

  await using output = await Muxer.open(process.stdout, {
    // isAllowedOutputFormat already narrowed format to a streamable muxer literal
    format: format as MuxerFormat,
    options: format === 'mp4' ? { movflags: MP4_FRAGMENTED_OPTIONS.movflags } : undefined,
  });

  const stream = input.audio();
  if (!stream && isTranscodings) {
    throw new Error('Audio processing requires an audio stream');
  }

  if (!isTranscodings || !stream) {
    const control = pipeline(input, output);
    await control.completion;
    return;
  }

  using decoder = await Decoder.create(stream);
  // Opus requires an 8..48 kHz rate and s16/flt samples; fltp input is rejected by libopus.
  const isEncoderIsOpus = codecFor(format, payload.codec) === FF_ENCODER_LIBOPUS;
  const filters = isEncoderIsOpus
    ? [FilterAPI.create('aresample=48000'), FilterAPI.create('aformat=sample_fmts=flt'), ...buildFilters(payload)]
    : buildFilters(payload);
  const bitrate: string = payload.bitrate ?? (format === 'ogg' ? '96k' : '128k');

  using encoder = await Encoder.create(codecFor(format, payload.codec), {
    autoResample: true,
    context: { bitRate: bitrate },
    decoder,
  });

  const control = pipeline(input, decoder, filters, encoder, output);
  await control.completion;
}
