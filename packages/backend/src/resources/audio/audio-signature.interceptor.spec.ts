import { describe, expect, it } from 'vitest';

import { AudioSignatureInterceptor } from './audio-signature.interceptor.js';

describe('AudioSignatureInterceptor', () => {
  it('allows audio and rejects non-audio', () => {
    const cls = {
      fileSignature: () => ({ get: () => ({ mime: 'audio/mpeg' }) }),
      request: () => ({ url: '/audio' }),
    };

    const allowing = new AudioSignatureInterceptor({ isAudio: () => true } as never, cls as never);
    expect((allowing as unknown as { intercept(...args: never[]): 'next' }).intercept(undefined as never, { handle: () => 'next' } as never)).toBe('next');

    const rejecting = new AudioSignatureInterceptor({ isAudio: () => false } as never, cls as never);
    expect(() => rejecting.intercept(undefined as never, { handle: () => 'next' } as never)).toThrow();
  });
});