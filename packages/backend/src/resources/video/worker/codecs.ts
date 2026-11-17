import {
  FF_ENCODER_LIBAOM_AV1,
  FF_ENCODER_LIBVPX_VP9,
  FF_ENCODER_LIBX264,
} from 'node-av/constants';

import type { VideoProcessorType } from '../schema.js';

/**
 *
// eslint-disable-next-line jsdoc/require-param-description
 * @param payload Description.
 * @param codec Description.
 */

// eslint-disable-next-line jsdoc/require-returns
/**
 *
// eslint-disable-next-line jsdoc/require-param-description
// eslint-disable-next-line jsdoc/require-param-description
 * @param value Description.
 */
export function parseBitrate(value: string): number {
  const match = value.match(/^(\d+)([kM])$/i);
  if (!match) return 2_000_000;
  const [, amount, unit] = match;
  return (Number(amount) || 0) * (unit?.toLowerCase() === 'k' ? 1000 : 1_000_000);
}

// eslint-disable-next-line jsdoc/require-returns
/**
 *
// eslint-disable-next-line jsdoc/require-param-description
 * @param codec Description.
 */
export function videoEncoderConstant(codec: VideoProcessorType["codec"]) {
  if (codec === "vp9") return FF_ENCODER_LIBVPX_VP9;
  if (codec === "av1") return FF_ENCODER_LIBAOM_AV1;
  return FF_ENCODER_LIBX264;
}
