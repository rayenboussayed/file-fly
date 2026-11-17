import { describe, expect, it } from 'vitest';

import { VideoSignatureInterceptor } from './video-signature.interceptor.js';

describe('VideoSignatureInterceptor', () => {
  it('allows video and rejects non-video', () => {
    const cls = {
      fileSignature: () => ({ get: () => ({ mime: 'video/mp4' }) }),
      request: () => ({ url: '/video' }),
    };

    const allowing = new VideoSignatureInterceptor({ isVideo: () => true } as never, cls as never);
    expect((allowing as unknown as { intercept(...args: never[]): 'next' }).intercept(undefined as never, { handle: () => 'next' } as never)).toBe('next');

    const rejecting = new VideoSignatureInterceptor({ isVideo: () => false } as never, cls as never);
    expect(() => rejecting.intercept(undefined as never, { handle: () => 'next' } as never)).toThrow();
  });
});