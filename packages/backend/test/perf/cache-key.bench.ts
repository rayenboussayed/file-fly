import { djb2 } from 'jutilities/hash';
import { superjson } from 'jutilities/json';
import { bench, describe } from 'vitest';

/**
 * Hashes an arbitrary value into a deterministic, url/fs-safe cache key.
 * @param options - Value to hash (the upload/download base-key parts).
 * @returns The cache key.
 */
const generateCacheKey = (options: unknown): string =>
  djb2(superjson.stringify(options)).toString();

/**
 * Payload shaped like the value produced by FileParserInterceptor.buildCacheKey
 * (signature, full query string, upload content length and SHA-512 prefix hash).
 */
const UPLOAD_PAYLOAD = {
  contentLength: 908_643,
  fileHash: 'a'.repeat(88),
  fileSignature: { ext: 'mp3', mime: 'audio/mpeg' },
  query: { bitrate: '192k', source: 'https://fixtures.local/audio-0.mp3', trim: '5' },
};

/**
Payload for a `source=` download, where content length is unknown at key time.
 */
const DOWNLOAD_PAYLOAD = {
  contentLength: 0,
  fileHash: '',
  fileSignature: { ext: 'mp4', mime: 'video/mp4' },
  query: { source: 'https://fixtures.local/video-0.mp4' },
};

describe('generateCacheKey', () => {
  bench('upload cache key', () => {
    const key = generateCacheKey(UPLOAD_PAYLOAD);
    // Consume the result so the compiler cannot dead-code-eliminate the call.
    if (key.length === 0) {
      throw new Error('empty key');
    }
  }, {
    throws: true,
  });

  bench('download cache key', () => {
    const key = generateCacheKey(DOWNLOAD_PAYLOAD);
    if (key.length === 0) {
      throw new Error('empty key');
    }
  }, {
    throws: true,
  });
});
