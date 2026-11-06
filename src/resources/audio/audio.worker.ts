import { Decoder, Demuxer, Encoder, FilterAPI, Muxer, pipeline } from 'node-av/api';
import {
  FF_ENCODER_AAC,
  FF_ENCODER_FLAC,
  FF_ENCODER_LIBMP3LAME,
  FF_ENCODER_LIBOPUS,
  FF_ENCODER_PCM_S16LE,
} from 'node-av/constants';
import { workerData } from 'node:worker_threads';

import type { MuxerFormat } from '@/constants/av-formats.js';

import type { AudioProcessorType } from './schema.js';
import type { AudioWorkerData } from './type.js';

import { isAllowedOutputFormat, MP4_FRAGMENTED_OPTIONS } from '../common/capabilities.js';

const data: AudioWorkerData = workerData;

/**
 *
 * @param payload Requested adjustments.
 * @returns Ordered filter graph.
 */
function buildFilters(payload: AudioProcessorType): FilterAPI[] {
  const filters: FilterAPI[] = [];

  if (payload.trimStart !== undefined || payload.trimEnd !== undefined) {
    const start = payload.trimStart ?? 0;
    const end = payload.trimEnd;
    filters.push(FilterAPI.create(end === undefined ? `atrim=start=${start}` : `atrim=start=${start}:end=${end}`));
    filters.push(FilterAPI.create('asetpts=PTS-STARTPTS'));
  }

  if (payload.channels === '1') filters.push(FilterAPI.create('pan=mono|c0=.5*c0+.5*c1'));
  if (payload.sampleRate) filters.push(FilterAPI.create(`aresample=${payload.sampleRate}`));
  if (payload.gain !== undefined) filters.push(FilterAPI.create(`volume=${payload.gain}dB`));
  if (payload.speed !== undefined) filters.push(FilterAPI.create(`atempo=${payload.speed}`));
  if (payload.normalize) filters.push(FilterAPI.create('loudnorm=I=-16:TP=-1.5:LRA=11'));
  if (payload.denoise) filters.push(FilterAPI.create('anlmdn'));
  if (payload.compress) filters.push(FilterAPI.create('acompressor'));
  if (payload.fadeIn !== undefined) filters.push(FilterAPI.create(`afade=t=in:st=0:d=${payload.fadeIn}`));
  if (payload.fadeOut !== undefined) filters.push(FilterAPI.create(`afade=t=out:st=0:d=${payload.fadeOut}`));

  return filters;
}

/**
 *
 * @param format Requested export format.
 * @param requested Requested codec.
 * @returns FFmpeg encoder constant.
 */
function codecFor(
  format: NonNullable<AudioProcessorType['format']>,
  requested?: AudioProcessorType['codec'],
) {
  if (requested === 'flac') return FF_ENCODER_FLAC;
  if (requested === 'mp3') return FF_ENCODER_LIBMP3LAME;
  if (requested === 'opus') return FF_ENCODER_LIBOPUS;
  if (requested === 'pcm') return FF_ENCODER_PCM_S16LE;
  if (requested === 'aac') return FF_ENCODER_AAC;
  if (format === 'flac') return FF_ENCODER_FLAC;
  if (format === 'mp3') return FF_ENCODER_LIBMP3LAME;
  if (format === 'ogg' || format === 'webm') return FF_ENCODER_LIBOPUS;
  if (format === 'adts') return FF_ENCODER_AAC;
  return FF_ENCODER_AAC;
}

/**
 *
 */
async function metadata() {
  const input = await Demuxer.open(process.stdin as never, { format: data.inputFormat, options: { analyzeduration: 5_000_000, probesize: 5_000_000 } });
  try {
    process.stdout.write(
      `${JSON.stringify({
        duration: input.duration,
        format: input.formatName,
        streams: input.streams.map((stream) => ({
          channels: stream.codecpar.channels,
          codec: stream.codecpar.codecId,
          index: stream.index,
          sampleRate: stream.codecpar.sampleRate,
          type: stream.codecpar.codecType,
        })),
      })}\n`,
    );
  } finally {
    process.stdout.end();
    await input.close();
  }
}

/**
 *
 * @param payload Output settings.
 */
async function processMedia(payload: AudioProcessorType) {
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
    format: data.inputFormat,
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
    context: { bitRate: bitrate },
    decoder,
  });

  const control = pipeline(input, decoder, filters, encoder, output);
  await control.completion;

  for (const filter of filters) filter.close();
}

/**
 *
 */
async function stats() {
  const input = await Demuxer.open(process.stdin as never, { format: data.inputFormat, options: { analyzeduration: 5_000_000, probesize: 5_000_000 } });
  try {
    process.stdout.write(
      `${JSON.stringify({
        duration: input.duration,
        format: input.formatName,
        streams: input.streams.map((stream) => ({
          bitrate: stream.codecpar.bitRate,
          channels: stream.codecpar.channels,
          codec: stream.codecpar.codecId,
          index: stream.index,
          sampleRate: stream.codecpar.sampleRate,
        })),
      })}\n`,
    );
  } finally {
    await input.close();
  }
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
