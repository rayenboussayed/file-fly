import type { Readable } from 'node:stream';

import {
  CallHandler,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { tee } from 'jutilities/node-stream';
import { createHash } from 'node:crypto';
import { request as netRequest } from 'undici';

import { HEADER_X_FILE_HASH } from '@/constants/header.js';
import { environment } from '@/environment.js';
import { SourceSchema } from '@/schema.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';

import { FileTypeService } from '../services/file-type.service.js';
import { generateCacheKey } from '../utils/cache.js';

@Injectable()
export class FileParserInterceptor implements NestInterceptor {
  constructor(
    private readonly cls: NormalizedClsService,
    private readonly fileTypeService: FileTypeService,
  ) {}

  async intercept(_: never, next: CallHandler) {
    const request = this.cls.request();
    if (
      !request.url.startsWith('/audio') &&
      !request.url.startsWith('/image') &&
      !request.url.startsWith('/ocr') &&
      !request.url.startsWith('/video')
    ) {
      return next.handle();
    }

    await this.openSource();
    await this.fileTypeService.signature({
      stream: this.branchSource(),
    });
    await this.buildCacheKey();

    return next.handle();
  }

  /**
   * Splits the current source stream: returns one branch, keeps the other as the source.
   * @returns Result.
   */
 private branchSource(): Readable {
    const [branch, rest] = tee({
      source: this.cls.sourceStream().get(),
    });
    this.cls.sourceStream().set(rest);
    return branch;
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
        this.branchSource(),
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

  private async openSource() {
    const request = this.cls.request()
    if (request.method.toUpperCase() === 'POST') {
      this.cls.sourceDirection().set('upload');
      this.cls.sourceStream().set(request.raw);
      return;
    }

    const { source } = SourceSchema.parse(request.query);
    const { body } = await netRequest(source, {
      headers: request.headers,
      method: 'GET',
      signal: request.signal,
    });
    this.cls.sourceDirection().set('download');
    this.cls.sourceStream().set(body);
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
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
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
