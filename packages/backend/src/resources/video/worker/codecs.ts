import {
  FF_ENCODER_LIBAOM_AV1,
  FF_ENCODER_LIBVPX_VP9,
  FF_ENCODER_LIBX264,
} from 'node-av/constants';

import type { VideoProcessorType } from '../schema.js';

/**
 * Parses a video bitrate literal (`1200k`, `5M`) into bits per second.
 * @param value - The bitrate literal from the query (e.g. '2500k').
 * @returns The bitrate in bits per second, defaulting to 2 000 000 when unparsable.
 */
export function parseBitrate(value: string): number {
  const match = value.match(/^(\d+)([kM])$/i);
  const amount = match?.[1];
  const unit = match?.[2];
  if (amount === undefined || unit === undefined) return 2_000_000;
  return Number(amount) * (unit.toLowerCase() === 'k' ? 1000 : 1_000_000);
}

/**
 * Maps the public codec name to the node-av FFmpeg encoder constant.
 * @param codec - The codec from the query (`vp9` | `av1` | `x264`-family).
 * @returns The FFmpeg encoder constant for passing to the output stream.
 */
export function videoEncoderConstant(codec: VideoProcessorType["codec"]) {
  if (codec === "vp9") return FF_ENCODER_LIBVPX_VP9;
  if (codec === "av1") return FF_ENCODER_LIBAOM_AV1;
  return FF_ENCODER_LIBX264;
}
