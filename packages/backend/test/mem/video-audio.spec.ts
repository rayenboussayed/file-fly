import { describe, expect, it } from 'vitest';

import { VideoAudioSchema } from '@/resources/video/schema.js';

import { settleHeap } from './helpers.js';

/**
Iterations in the measured loop.
 */
const ITERATIONS = 100;

/**
Representative query for the audio extraction route.
 */
const QUERY = {
  bitrate: '192k',
  format: 'mp3',
  source: 'https://fixtures.local/tiny.mp4',
};

describe('video audio query parsing memory', () => {
  it('does not retain parsed queries across calls', async () => {
    VideoAudioSchema.parse(QUERY);
    await settleHeap();
    const before = process.memoryUsage();

    for (let index = 0; index < ITERATIONS; index += 1) {
      const parsed = VideoAudioSchema.parse(QUERY);
      expect(parsed.format).toBe('mp3');
    }

    await settleHeap();
    const after = process.memoryUsage();

    expect(after.heapUsed - before.heapUsed).toBeLessThan(4 * 1024 * 1024);
    expect(after.arrayBuffers - before.arrayBuffers).toBeLessThan(8 * 1024 * 1024);
  });
});
