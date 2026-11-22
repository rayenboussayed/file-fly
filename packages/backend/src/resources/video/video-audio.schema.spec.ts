import { describe, expect, it } from 'vitest';

import { VideoAudioSchema } from './schema.js';

describe('VideoAudioSchema', () => {
  it('applies the mp3 default and keeps all audio defaults', () => {
    const parsed = VideoAudioSchema.parse({
      source: 'https://example.com/v.mp4',
    });
    expect(parsed.format).toBe('mp3');
    expect(parsed.compress).toBe(false);
    expect(parsed.denoise).toBe(false);
    expect(parsed.normalize).toBe(false);
  });

  it('rejects a codec key because the worker derives it from format', () => {
    expect(() =>
      VideoAudioSchema.parse({
        codec: 'aac',
        source: 'https://example.com/v.mp4',
      }),
    ).toThrow();
  });

  it('coerces numeric and boolean query values', () => {
    const parsed = VideoAudioSchema.parse({
      bitrate: '192k',
      channels: '2',
      format: 'ogg',
      gain: '3',
      sampleRate: '48000',
      source: 'https://example.com/v.mp4',
      trimEnd: '2',
      trimStart: '1',
    });
    expect(parsed.format).toBe('ogg');
    expect(parsed.bitrate).toBe('192k');
    expect(parsed.channels).toBe('2');
    expect(parsed.sampleRate).toBe('48000');
    expect(parsed.gain).toBe(3);
    expect(parsed.trimStart).toBe(1);
    expect(parsed.trimEnd).toBe(2);
  });

  it('rejects unknown keys', () => {
    expect(() =>
      VideoAudioSchema.parse({
        bogus: 'x',
        source: 'https://example.com/v.mp4',
      }),
    ).toThrow();
  });

  it('rejects an invalid source url', () => {
    expect(() => VideoAudioSchema.parse({ source: 'not-a-url' })).toThrow();
  });
});
