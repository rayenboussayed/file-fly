import { describe, expect, it } from 'vitest';

import { HEADER_X_FILE_HASH, HEADER_X_FONT_SUBSET } from './constants/header.js';
import { buildCorsOptions } from './cors.js';

describe('buildCorsOptions', () => {
  it('allows exactly the auth, content-type and upload-hint request headers', () => {
    expect(buildCorsOptions(undefined).allowedHeaders).toEqual([
      'authorization',
      'content-type',
      'x-auth-password',
      'x-auth-username',
      HEADER_X_FILE_HASH,
    ]);
  });

  it('disables cross-origin reads when no origin is configured', () => {
    expect(buildCorsOptions(undefined).origin).toBe(false);
  });

  it('uses the configured origins', () => {
    expect(buildCorsOptions(['https://app.example.com']).origin).toEqual([
      'https://app.example.com',
    ]);
  });

  it('keeps credentials and exposes the response headers', () => {
    const options = buildCorsOptions(['https://app.example.com']);
    expect(options.credentials).toBe(true);
    expect(options.exposedHeaders).toEqual([HEADER_X_FILE_HASH, HEADER_X_FONT_SUBSET]);
  });
});
