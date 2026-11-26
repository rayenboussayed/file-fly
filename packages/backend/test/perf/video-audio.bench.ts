import { bench, describe } from 'vitest';

import { VideoAudioSchema } from '@/resources/video/schema.js';

/**
Representative query for the audio extraction route.
 */
const QUERY = {
  bitrate: '192k',
  channels: '2',
  format: 'mp3',
  source: 'https://fixtures.local/tiny.mp4',
};

describe('video audio request boundary', () => {
  bench('validates the audio query', () => {
    const parsed = VideoAudioSchema.parse(QUERY);
    // Consume the result so the compiler cannot dead-code-eliminate the call.
    if (parsed.format !== 'mp3') {
      throw new Error('unexpected format');
    }
  }, {
    throws: true,
  });
});
