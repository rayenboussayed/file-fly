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
  const amount = match?.[1];
  const unit = match?.[2];
  if (amount === undefined || unit === undefined) return 2_000_000;
  return Number(amount) * (unit.toLowerCase() === 'k' ? 1_000 : 1_000_000);
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
