import type { FilterAPI, NamedStages } from 'node-av/api';

import {
  Decoder,
  Demuxer,
  Encoder,
  Muxer,
  pipeline,
} from 'node-av/api';
import {
  FF_ENCODER_AAC,
  FF_ENCODER_LIBOPUS,
} from 'node-av/constants';
import { workerData } from 'node:worker_threads';

import type { MuxerFormat } from '@/constants/av-formats.js';

import { isAllowedOutputFormat, MP4_FRAGMENTED_OPTIONS } from '@/utils/capabilities.js';

import type { VideoProcessorType } from '../schema.js';
import type { VideoWorkerData } from '../type.js';

import { parseBitrate, videoEncoderConstant } from './codecs.js';
import { buildAudioFilters, buildVideoFilters } from './filters.js';

const data: VideoWorkerData = workerData;

/**
 *
 * @param payload Description.
 * @returns Result.
 */
// eslint-disable-next-line sonarjs/cognitive-complexity
export async function processMedia(payload: VideoProcessorType) {
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
