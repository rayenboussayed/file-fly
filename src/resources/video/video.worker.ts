import type { NamedStages } from 'node-av/api';

import { Decoder, Demuxer, Encoder, FilterAPI, Muxer, pipeline } from 'node-av/api';
import {
  FF_ENCODER_AAC,
  FF_ENCODER_LIBAOM_AV1,
  FF_ENCODER_LIBOPUS,
  FF_ENCODER_LIBVPX_VP9,
  FF_ENCODER_LIBX264,
} from 'node-av/constants';
import { workerData } from 'node:worker_threads';

import type { VideoProcessorType } from './schema.js';
import type { VideoWorkerData } from './type.js';

const data: VideoWorkerData = workerData;
const inputFormat = data.inputFormat;
if (!inputFormat) { throw new Error('Unsupported input format'); }

/**
 *
 * @param payload Description.
 * @returns Result.
 */
function buildAudioFilters(payload: VideoProcessorType) {
  const filters: FilterAPI[] = [];
  if (payload.audioChannels === '1') filters.push(FilterAPI.create('pan=mono|c0=.5*c0+.5*c1'));
  if (payload.audioSampleRate) filters.push(FilterAPI.create(`aresample=${payload.audioSampleRate}`));
  if (payload.audioNormalize) filters.push(FilterAPI.create('loudnorm=I=-16:TP=-1.5:LRA=11'));
  return filters;
}

/**
 *
 * @param payload Description.
 * @returns Result.
 */
function buildVideoFilters(payload: VideoProcessorType) {
  const filters: FilterAPI[] = [];

  if (payload.trimStart !== undefined || payload.trimEnd !== undefined) {
    const start = payload.trimStart ?? 0;
    filters.push(
      FilterAPI.create(
        payload.trimEnd === undefined
          ? `trim=start=${start}`
          : `trim=start=${start}:end=${payload.trimEnd}`,
      ),
      FilterAPI.create('setpts=PTS-STARTPTS'),
    );
  }

  if (payload.deinterlace) filters.push(FilterAPI.create('yadif'));
  if (payload.width !== undefined || payload.height !== undefined) {
    filters.push(FilterAPI.create(`scale=${payload.width ?? -1}:${payload.height ?? -1}`));
  }
  if (payload.fps !== undefined) filters.push(FilterAPI.create(`fps=${payload.fps}`));
  if (payload.rotate === '90') filters.push(FilterAPI.create('transpose=1'));
  if (payload.rotate === '180') filters.push(FilterAPI.create('transpose=1,transpose=1'));
  if (payload.rotate === '270') filters.push(FilterAPI.create('transpose=2'));
  if (payload.flip) filters.push(FilterAPI.create('hflip'));
  if (payload.flop) filters.push(FilterAPI.create('vflip'));
  if (payload.normalize) filters.push(FilterAPI.create('eq=contrast=1.1:brightness=0.04:saturation=1.05'));
  if (payload.denoise) filters.push(FilterAPI.create('hqdn3d'));
  if (payload.sharpen) filters.push(FilterAPI.create('unsharp=5:5:1.0:5:5:0.0'));
  if (payload.grayscale) filters.push(FilterAPI.create('hue=s=0'));
  filters.push(FilterAPI.create('format=yuv420p'));

  return filters;
}

/**
 *
 * @param format Description.
 * @returns Result.
 */

/**
 *
 * @param payload Description.
 * @returns Result.
 */
function hasAudioTranscoding(payload: VideoProcessorType) {
  return [
    payload.audioBitrate,
    payload.audioChannels,
    payload.audioCodec,
    payload.audioNormalize,
    payload.audioSampleRate,
  ].some(Boolean);
}

/**
 *
 * @param payload Description.
 * @returns Result.
 */
function hasVideoTranscoding(payload: VideoProcessorType) {
  return [
    payload.bitrate,
    payload.codec,
    payload.crf,
    payload.deinterlace,
    payload.denoise,
    payload.flip,
    payload.flop,
    payload.fps,
    payload.grayscale,
    payload.height,
    payload.normalize,
    payload.preset,
    payload.rotate,
    payload.sharpen,
    payload.trimEnd,
    payload.trimStart,
    payload.width,
  ].some(Boolean);
}

/**
 *
 * @param format Description.
 * @returns Result.
 */
function isQuickTime(format: VideoProcessorType['format']) {
  return format === 'mp4' || format === 'mov';
}

/**
 *
 * @returns Result.
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
 * @param value Description.
 * @returns Parsed bitrate.
 */
function parseBitrate(value: string): number {
  const match = value.match(/^(\d+)([kM])$/i);
  if (!match) return 2_000_000;
  const [, amount, unit] = match;
  return (Number(amount) || 0) * (unit?.toLowerCase() === 'k' ? 1000 : 1_000_000);
}

/**
 * Process and optimize the video stream.
 * @param payload Requested output settings.
 */
 
/**
 *
 * @param payload Description.
 */
 
/**
 *
 * @param payload Description.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
async function processMedia(payload: VideoProcessorType) {
  const format = payload.format;
  const videoTranscoding = hasVideoTranscoding(payload);
  const audioTranscoding = hasAudioTranscoding(payload);

  const input = await Demuxer.open(process.stdin as never, { format: inputFormat });
  const muxOptions = isQuickTime(format)
    ? { format, input, options: { movflags: 'frag_keyframe+empty_moov' } }
    : { format, input };
  const output = await Muxer.open('/dev/stdout', muxOptions);

  const videoStream = input.video();
  const audioStream = input.audio();
  const stages = {} as NamedStages<'audio' | 'video'>;

  const decoders: Decoder[] = [];
  const encoders: Encoder[] = [];
  const filters: FilterAPI[] = [];

  if (videoStream && videoTranscoding) {
    const decoder = await Decoder.create(videoStream);
    const videoFilters = buildVideoFilters(payload);
    const encoder = await Encoder.create(videoCodecFor(payload.codec), {
      bitrate: parseBitrate(payload.bitrate ?? '2M'),
      context: { gopSize: 60, maxBFrames: 0 },
      decoder,
      options: { crf: payload.crf ?? 23, preset: payload.preset ?? 'medium' },
    });
    decoders.push(decoder);
    encoders.push(encoder);
    filters.push(...videoFilters);
    stages.video = [decoder, ...videoFilters, encoder];
  } else {
    stages.video = 'passthrough';
  }

  if (audioStream && audioTranscoding) {
    if (!payload.audioNormalize && !payload.audioCodec && !payload.audioBitrate && !payload.audioChannels && !payload.audioSampleRate) {
      stages.audio = 'passthrough';
    } else {
      const decoder = await Decoder.create(audioStream);
      const audioFilters = buildAudioFilters(payload);
      const encoder = await Encoder.create(
        payload.audioCodec === 'opus' ? FF_ENCODER_LIBOPUS : FF_ENCODER_AAC,
        {
          bitrate: payload.audioBitrate ?? '128k',
          decoder,
        },
      );
      decoders.push(decoder);
      encoders.push(encoder);
      filters.push(...audioFilters);
      stages.audio = [decoder, ...audioFilters, encoder];
    }
  } else {
    stages.audio = 'passthrough';
  }

  if (decoders.length === 0 && !videoStream && !audioStream) {
    await input.close();
    await output.close();
    throw new Error('Video processing requires an audio or video stream');
  }

  if (decoders.length === 0) {
    const control = pipeline(input, output);
    await control.completion;
    await input.close();
    await output.close();
    return;
  }

  const control = pipeline(input, stages, output);
  await control.completion;
  decoders.forEach((item) => item.close());
  encoders.forEach((item) => item.close());
  filters.forEach((item) => item.close());
  await input.close();
  await output.close();
}

/**
 *
 * @returns Result.
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

/**
 *
 * @param codec Description.
 * @returns Encoder codec.
 */
function videoCodecFor(codec?: VideoProcessorType['codec']) {
  if (codec === 'vp9') return FF_ENCODER_LIBVPX_VP9;
  if (codec === 'av1') return FF_ENCODER_LIBAOM_AV1;
  return FF_ENCODER_LIBX264;
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