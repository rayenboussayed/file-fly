import {
  FF_ENCODER_LIBAOM_AV1,
  FF_ENCODER_LIBVPX_VP9,
  FF_ENCODER_LIBX264,
} from 'node-av/constants';
import { describe, expect, it } from 'vitest';

import { parseBitrate, videoEncoderConstant } from './codecs.js';

describe('parseBitrate', () => {
  it('parses k and M units, case-insensitively', () => {
    expect(parseBitrate('512k')).toBe(512_000);
    expect(parseBitrate('1M')).toBe(1_000_000);
    expect(parseBitrate('2m')).toBe(2_000_000);
    expect(parseBitrate('20M')).toBe(20_000_000);
  });

  it('falls back to 2 Mbps for malformed input', () => {
    expect(parseBitrate('garbage')).toBe(2_000_000);
    expect(parseBitrate('')).toBe(2_000_000);
    expect(parseBitrate('1G')).toBe(2_000_000);
    expect(parseBitrate('1.5M')).toBe(2_000_000);
  });
});

describe('videoEncoderConstant', () => {
  it('maps every codec to its encoder constant', () => {
    expect(videoEncoderConstant('h264')).toBe(FF_ENCODER_LIBX264);
    expect(videoEncoderConstant('vp9')).toBe(FF_ENCODER_LIBVPX_VP9);
    expect(videoEncoderConstant('av1')).toBe(FF_ENCODER_LIBAOM_AV1);
  });
});
