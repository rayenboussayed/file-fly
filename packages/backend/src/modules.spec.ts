import { describe, expect, it } from 'vitest';

describe('modules', () => {
  it('can be imported without side effects', async () => {
    await import('./resources/audio/audio.module.js');
    await import('./resources/image/image.module.js');
    await import('./resources/video/video.module.js');
    await import('./app.module.js');
    await import('./undici.js');
// eslint-disable-next-line sonarjs/no-trivial-assertions
    expect(true).toBe(true);
  });
});
