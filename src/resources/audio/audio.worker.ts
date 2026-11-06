import { Decoder, Demuxer, Encoder, FilterAPI, Muxer, pipeline } from 'node-av/api';
import {
  FF_ENCODER_AAC,
  FF_ENCODER_FLAC,
  FF_ENCODER_LIBMP3LAME,
  FF_ENCODER_LIBOPUS,
  FF_ENCODER_PCM_S16LE,
} from 'node-av/constants';
import { workerData } from 'node:worker_threads';

import type { AudioProcessorType } from './schema.js';
import type { AudioWorkerData } from './type.js';

const data = workerData as AudioWorkerData;
const inputFormat = data.inputFormat;
if (!inputFormat) { throw new Error('Unsupported input format'); }

/**
 *
 * @param payload Description.
 * @returns Result.
 */
function buildFilters(payload: AudioProcessorType) {
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
 * @param format Description.
 * @param requested Description.
 * @returns Result.
 */
function codecFor(format: NonNullable<AudioProcessorType['format']>, requested?: AudioProcessorType['codec']) {
  if (requested === 'flac') return FF_ENCODER_FLAC;
  if (requested === 'mp3') return FF_ENCODER_LIBMP3LAME;
  if (requested === 'opus') return FF_ENCODER_LIBOPUS;
  if (requested === 'pcm') return FF_ENCODER_PCM_S16LE;
  if (requested === 'aac') return FF_ENCODER_AAC;
  if (format === 'flac' || format === 'w64') return FF_ENCODER_FLAC;
  if (format === 'mp3') return FF_ENCODER_LIBMP3LAME;
  if (format === 'ogg' || format === 'webm') return FF_ENCODER_LIBOPUS;
  if (format === 'wav' || format === 'aiff') return FF_ENCODER_PCM_S16LE;
  return FF_ENCODER_AAC;
}

/**
 *
 * @param format Description.
 * @returns Result.
 */
function isQuickTime(format: AudioProcessorType['format']) {
  return format === 'mp4' || format === 'mov';
}

/**
 *
 */
async function metadata() {
  const input = await Demuxer.open(process.stdin as never, { format: inputFormat });
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
 * Process and optimize the audio stream.
 * @param payload Requested output settings.
 */
async function processMedia(payload: AudioProcessorType) {
  const format = payload.format;
  const transcoding = [
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

  const input = await Demuxer.open(process.stdin as never, { format: inputFormat });
  const muxOptions = isQuickTime(format)
    ? { format, input, options: { movflags: 'frag_keyframe+empty_moov' } }
    : { format, input };
  const output = await Muxer.open('/dev/stdout', muxOptions);

  if (!transcoding) {
    const control = pipeline(input, output);
    await control.completion;
    await input.close();
    await output.close();
    return;
  }

  const stream = input.audio();
  if (!stream) {
    await input.close();
    await output.close();
    throw new Error('Audio processing requires an audio stream');
  }

  const decoder = await Decoder.create(stream);
  const filters = buildFilters(payload);
  const bitrate: string = payload.bitrate ?? (format === 'ogg' ? '96k' : '128k');
  const encoder = await Encoder.create(codecFor(format, payload.codec), {
    context: { bitRate: bitrate },
    decoder,
  });
  const control = pipeline(input, decoder, filters, encoder, output);
  await control.completion;
  decoder.close();
  encoder.close();
  filters.forEach((filter) => filter.close());
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