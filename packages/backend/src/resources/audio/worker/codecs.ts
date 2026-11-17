import {
  FF_ENCODER_AAC,
  FF_ENCODER_FLAC,
  FF_ENCODER_LIBMP3LAME,
  FF_ENCODER_LIBOPUS,
  FF_ENCODER_PCM_S16LE,
} from 'node-av/constants';

import type { AudioProcessorType } from '../schema.js';

/**
 *
 * @param format Requested export format.
 * @param requested Requested codec.
 * @returns FFmpeg encoder constant.
 */
export function codecFor(
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
