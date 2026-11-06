import { describe, expect, it } from 'vitest';

import { ImageSignatureInterceptor } from './image-signature.interceptor.js';

describe('ImageSignatureInterceptor', () => {
  it('allows non-image files and rejects images', () => {
    const cls = { fileSignature: () => ({ get: () => ({ mime: 'image/png' }) }) };
    const next = { handle: () => 'next' };

    const allowing = new ImageSignatureInterceptor({ isImage: () => false } as never, cls as never);
    expect(allowing.intercept(undefined as never, next as never)).toBe('next');

    const rejecting = new ImageSignatureInterceptor({ isImage: () => true } as never, cls as never);
    expect(() => rejecting.intercept(undefined as never, next as never)).toThrow();
  });
});