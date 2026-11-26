import type { Readable } from 'node:stream';

import {
  CallHandler,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { djb2 } from 'jutilities/hash';
import { superjson } from 'jutilities/json';
import { toBuffer } from 'jutilities/to';
import { createHash } from 'node:crypto';

import { HEADER_X_FILE_HASH } from '@/constants/header.js';
import { environment } from '@/environment.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { headerValue } from '@/utils/http.js';

import { FileTypeService } from '../services/file-type.service.js';
import { forkSource } from '../utils/fork-source.js';
import { openMediaSource } from '../utils/open-source.js';

/**
 * Hashes an arbitrary value into a deterministic, url/fs-safe cache key.
 * @param options - Value to hash (upload base key parts or download base key parts).
 * @returns The cache key.
 */
const generateCacheKey = (options: unknown): string =>
  djb2(superjson.stringify(options)).toString();

/**
 * Parses a content-length header with explicit radix. Kept behind a parameter so
 * parseInt semantics survive: `Number('42abc')` is NaN while
 * `parseInt('42abc', 10)` is 42, and the cache key depends on that value.
 * @param value - Raw header value.
 * @param radix - Numeric base, always 10 at the call site.
 * @returns The parsed integer.
 */
const parseHeaderInteger = (value: string, radix: number): number =>
  Number.parseInt(value, radix);

/**
 * Builds and stores the cache key for the scanned upload or download.
 * @param cls - CLS facade carrying the request, signature and hash.
 */
const buildCacheKey = async (cls: NormalizedClsService): Promise<void> => {
  const request = cls.request();
  const base = {
    fileSignature: cls.fileSignature().get(),
    query: request.query,
  };

  if (cls.sourceDirection().get() === 'download') {
    const clientHash = headerValue(request.headers, HEADER_X_FILE_HASH)?.toString().trim();
    if (clientHash) cls.fileHash().set(clientHash);
    cls.cacheKey().set(generateCacheKey({ ...base, contentLength: 0, fileHash: '' }));
    return;
  }

  const fileHash =
    headerValue(request.headers, HEADER_X_FILE_HASH)?.toString().trim() ||
    (await prefixHash(forkSource(cls), environment.FILE_HASH_HEADER_SIZE));
  cls.fileHash().set(fileHash);

  cls.cacheKey().set(
    generateCacheKey({
      ...base,
      contentLength: parseHeaderInteger(request.headers['content-length'] ?? '0', 10),
      fileHash,
    }),
  );
};

/**
Probes the upload’s file signature, stamps the CLS store (signature, hash, cache key) and publishes the probe.
 */
@Injectable()
export class FileParserInterceptor implements NestInterceptor {
  constructor(
    private readonly cls: NormalizedClsService,
    private readonly fileTypeService: FileTypeService,
  ) {}

  async intercept(_: never, next: CallHandler) {
    // Method-less requests (e.g. synthetic invocations) carry no media to process.
    if (!this.cls.request()?.method) {
      return next.handle();
    }

    await openMediaSource(this.cls);
    await this.fileTypeService.signature({
      stream: forkSource(this.cls),
    });
    await buildCacheKey(this.cls);

    return next.handle();
  }
}

/**
 * Hashes the first `size` bytes of the stream (or all of it when smaller).
 *
 * The branch is consumed with plain listeners, never an async iterator, so
 * it is not destroyed at the end: the probe branch of the request's tee must
 * stay intact for its sibling branch. Chunks beyond the prefix are discarded
 * in the same pass. Resolves as soon as the prefix is hashed (or EOF is
 * reached); the full remainder is dropped without resolving the caller.
 * @param stream - The readable branch to hash (left intact).
 * @param size - Maximum number of bytes to hash.
 * @returns SHA-512 hex of the hashed prefix (or entire) bytes.
 */
async function prefixHash(stream: Readable, size: number) {
  const hash = createHash('sha512');
  let length = 0;
  let isResolved = false;
  return new Promise<string>((resolve, reject) => {
    const done = () => {
      if (isResolved) return;
      isResolved = true;
      resolve(hash.digest('base64'));
    };
    stream.on('data', (chunk: Buffer | string | Uint8Array) => {
      if (length >= size) return; // prefix done: keep dropping the rest
      const buffer = toBuffer(chunk);
      const remaining = size - length;
      hash.update(
        remaining >= buffer.length ? buffer : buffer.subarray(0, remaining),
      );
      length += buffer.length;
      if (length >= size) done();
    });
    stream.once('end', done);
    stream.once('error', reject);
  });
}
