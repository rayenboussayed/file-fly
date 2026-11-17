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
    await this.buildCacheKey();

    return next.handle();
  }

  private async buildCacheKey() {
    const request = this.cls.request();
    const base = {
      fileSignature: this.cls.fileSignature().get(),
      query: request.query,
    };

    if (this.cls.sourceDirection().get() === 'download') {
      // eslint-disable-next-line security/detect-object-injection
      const clientHash = request.headers[HEADER_X_FILE_HASH]?.toString().trim();
      if (clientHash) this.cls.fileHash().set(clientHash);
      this.cls
        .cacheKey()
        .set(generateCacheKey({ ...base, contentLength: 0, fileHash: '' }));
      return;
    }

    const fileHash =
// eslint-disable-next-line security/detect-object-injection
      (request.headers[HEADER_X_FILE_HASH]?.toString().trim()) ||
      (await prefixHash(
        forkSource(this.cls),
        environment.FILE_HASH_HEADER_SIZE,
      ));
    this.cls.fileHash().set(fileHash);

    this.cls.cacheKey().set(
      generateCacheKey({
        ...base,
        contentLength: Number.parseInt(
          request.headers['content-length'] ?? '0',
          10,
        ),
        fileHash,
      }),
    );
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
 * @param stream Description.
 * @param size Description.
 * @returns Result.
 */
async function prefixHash(stream: Readable, size: number) {
  const hash = createHash('sha512');
  let length = 0;
  let resolved = false;
  return new Promise<string>((resolve, reject) => {
    const done = () => {
      if (resolved) return;
      resolved = true;
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
