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

import type { MuxerFormat } from '@/constants/av-formats.js';

import type { VideoProcessorType } from './schema.js';
import type { VideoWorkerData } from './type.js';

import { isAllowedOutputFormat, MP4_FRAGMENTED_OPTIONS } from '../common/capabilities.js';

const data: VideoWorkerData = workerData;

// eslint-disable-next-line jsdoc/require-returns
/**
 *
// eslint-disable-next-line jsdoc/require-param-description
// eslint-disable-next-line jsdoc/require-param-description
 * @param payload Description.
 */
function buildAudioFilters(payload: VideoProcessorType) {
  const filters: FilterAPI[] = [];
  if (payload.audioChannels === '1') filters.push(FilterAPI.create('pan=mono|c0=.5*c0+.5*c1'));
  if (payload.audioSampleRate) filters.push(FilterAPI.create(`aresample=${payload.audioSampleRate}`));
  if (payload.audioNormalize) filters.push(FilterAPI.create('loudnorm=I=-16:TP=-1.5:LRA=11'));
  return filters;
}

// eslint-disable-next-line jsdoc/require-returns
/**
 *
// eslint-disable-next-line jsdoc/require-param-description
// eslint-disable-next-line jsdoc/require-param-description
 * @param payload Description.
 */
function buildVideoFilters(payload: VideoProcessorType) {
  const filters: FilterAPI[] = [];

  if (payload.trimStart !== undefined || payload.trimEnd !== undefined) {
    const start = payload.trimStart ?? 0;
    filters.push(
      FilterAPI.create(payload.trimEnd === undefined ? `trim=start=${start}` : `trim=start=${start}:end=${payload.trimEnd}`),
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

// eslint-disable-next-line jsdoc/require-returns
/**
 *
// eslint-disable-next-line jsdoc/require-param-description
// eslint-disable-next-line jsdoc/require-param-description
 * @param payload Description.
 */
function hasAudioTranscoding(payload: VideoProcessorType) {
  return [payload.audioBitrate, payload.audioChannels, payload.audioCodec, payload.audioNormalize, payload.audioSampleRate].some(Boolean);
}

// eslint-disable-next-line jsdoc/require-returns
/**
 *
// eslint-disable-next-line jsdoc/require-param-description
// eslint-disable-next-line jsdoc/require-param-description
 * @param payload Description.
 */
function hasVideoTranscoding(payload: VideoProcessorType) {
  return [payload.bitrate, payload.codec, payload.crf, payload.deinterlace, payload.denoise, payload.flip, payload.flop, payload.fps, payload.grayscale, payload.height, payload.normalize, payload.preset, payload.rotate, payload.sharpen, payload.trimEnd, payload.trimStart, payload.width].some(Boolean);
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
          height: stream.codecpar.height,
          index: stream.index,
          sampleRate: stream.codecpar.sampleRate,
          type: stream.codecpar.codecType,
          width: stream.codecpar.width,
        })),
      })}\n`,
    );
  } finally {
    process.stdout.end();
    await input.close();
  }
}

// eslint-disable-next-line jsdoc/require-returns
/**
 *
// eslint-disable-next-line jsdoc/require-param-description
// eslint-disable-next-line jsdoc/require-param-description
 * @param value Description.
 */
function parseBitrate(value: string): number {
  const match = value.match(/^(\d+)([kM])$/i);
  if (!match) return 2_000_000;
  const [, amount, unit] = match;
  return (Number(amount) || 0) * (unit?.toLowerCase() === 'k' ? 1000 : 1_000_000);
}

/**
 *
// eslint-disable-next-line jsdoc/require-param-description
 * @param payload Description.
 * @param codec Description.
 */
 
/**
 *
 * @param payload Description.
 * @returns Result.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
async function processMedia(payload: VideoProcessorType) {
  const format = payload.format ?? 'mp4';
  if (!isAllowedOutputFormat(format)) {
    throw new Error(`Streaming output does not support format: ${format}`);
  }

  const videoTranscoding = hasVideoTranscoding(payload);
  const audioTranscoding = hasAudioTranscoding(payload);

  await using input = await Demuxer.open(process.stdin as never, {
    format: data.inputFormat,
    options: { analyzeduration: 5_000_000, probesize: 5_000_000 },
  });

  await using output = await Muxer.open(process.stdout, {
    format: format as MuxerFormat,
    options: format === 'mp4' ? { movflags: MP4_FRAGMENTED_OPTIONS.movflags } : undefined,
  });

  const videoStream = input.video();
  const audioStream = input.audio();

  if (!videoStream && !audioStream) {
    throw new Error('Video processing requires an audio or video stream');
  }

  const videoClip = videoTranscoding && videoStream;
  const audioClip = audioTranscoding && audioStream;

  if (!videoClip && !audioClip) {
    const control = pipeline(input, output);
    await control.completion;
    return;
  }

    const encoders: Encoder[] = [];
  const filters: FilterAPI[] = [];
  const stages = {} as NamedStages<'audio' | 'video'>;

  if (videoClip) {
    const decoder = await Decoder.create(videoStream!);
    const videoFilters = buildVideoFilters(payload);
    const videoEnc = videoEncoderConstant(payload.codec);
    const encoder = await Encoder.create(
      videoEnc,
      {
        bitrate: parseBitrate(payload.bitrate ?? '2M'),
        context: { gopSize: 60, maxBFrames: 0 },
        decoder,
        options: { crf: payload.crf ?? 23, preset: payload.preset ?? 'medium' },
      },
    );
    const heldDecoder = decoder;
    const heldEncoder = encoder;
    for (const filter of videoFilters) filters.push(filter);

    encoders.push(heldEncoder);
    stages.video = [heldDecoder, ...videoFilters, heldEncoder];
  } else {
    stages.video = 'passthrough';
  }

  if (audioClip) {
    const decoder = await Decoder.create(audioStream!);
    const audioFilters = buildAudioFilters(payload);
    const encoder = await Encoder.create(
      payload.audioCodec === 'opus' ? FF_ENCODER_LIBOPUS : FF_ENCODER_AAC,
      {
        bitrate: payload.audioBitrate ?? '128k',
        decoder,
      },
    );
    const heldDecoder = decoder;
    const heldEncoder = encoder;
    filters.push(...audioFilters);

    encoders.push(heldEncoder);
    stages.audio = [heldDecoder, ...audioFilters, heldEncoder];
  } else {
    stages.audio = 'passthrough';
  }

  if (audioStream && !audioClip && audioTranscoding === true && !payload.audioNormalize && !payload.audioCodec && !payload.audioBitrate && !payload.audioChannels && !payload.audioSampleRate) {
    // explicitly forced transcode provided nothing, leave as passthrough.
  }

  const control = pipeline(input, stages, output);
  await control.completion;
  // Queue cleanup handled by the FFmpeg pipeline/completion.
  for (const item of encoders) {
// eslint-disable-next-line deslint/no-empty-catch
    try { item.close(); } catch { /* best effort */ }
  }
  for (const item of filters) {
// eslint-disable-next-line deslint/no-empty-catch
    try { item.close(); } catch { /* best effort */ }
  }
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
          codec: stream.codecpar.codecId,
          height: stream.codecpar.height,
          index: stream.index,
          type: stream.codecpar.codecType,
          width: stream.codecpar.width,
        })),
      })}\n`,
    );
  } finally {
    await input.close();
  }
}

// eslint-disable-next-line jsdoc/require-returns
/**
 *
// eslint-disable-next-line jsdoc/require-param-description
 * @param codec Description.
 */
function videoEncoderConstant(codec: VideoProcessorType["codec"]) {
  if (codec === "vp9") return FF_ENCODER_LIBVPX_VP9;
  if (codec === "av1") return FF_ENCODER_LIBAOM_AV1;
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
