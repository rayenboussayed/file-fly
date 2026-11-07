import type { Readable } from 'node:stream';

import {
  CallHandler,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { tee } from 'jutilities/node-stream';
import { createHash } from 'node:crypto';
import { mergeMap } from 'rxjs';
import { request as netRequest } from 'undici';

import { HEADER_X_FILE_HASH } from '@/constants/header.js';
import { environment } from '@/environment.js';
import { SourceSchema } from '@/schema.js';
import { NormalizedClsService } from '@/services/normalized-cls.service.js';
import { sha512 } from '@/utils/hash.js';

import { FileTypeService } from '../services/file-type.service.js';
import { generateCacheKey } from '../utils/cache.js';

@Injectable()
export class FileParserInterceptor implements NestInterceptor {
  constructor(
    private readonly cls: NormalizedClsService,
    private readonly fileTypeService: FileTypeService,
  ) {}

  async intercept(_: never, next: CallHandler) {
    const reply = this.cls.response();
    const request = this.cls.request();
    if (
      !request.url.startsWith('/audio') &&
      !request.url.startsWith('/image') &&
      !request.url.startsWith('/video')
    ) {
      return next.handle();
    }

    await this.openSource();
    await this.fileTypeService.signature({
      stream: this.branchSource(),
    });
    await this.buildCacheKey();

    const fileHash = sha512
      .stream(this.branchSource())
      .then((buffer) => buffer.toString('base64'));
    void fileHash.then((hash) => this.cls.fileHash().set(hash));

    return next.handle().pipe(
      mergeMap(async (value) => {
        reply.header(HEADER_X_FILE_HASH, await fileHash);
        return value;
      }),
    );
  }

  /**
   * Splits the current source stream: returns one branch, keeps the other as the source.
   * @returns Result.
   */
 private branchSource(): Readable {
    const request = this.cls.request();
    const [branch, rest] = tee({
      signal: request.signal,
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
 *
 * @param stream Description.
 * @param size Description.
 * @returns Result.
 */
async function prefixHash(stream: Readable, size: number) {
  const hash = createHash('sha512');
  let length = 0;
  try {
    for await (const chunk of stream) {
      const buffer = Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk as Uint8Array);
      const remaining = size - length;
      if (remaining <= 0) break;
      hash.update(
        remaining >= buffer.length ? buffer : buffer.subarray(0, remaining),
      );
      length += buffer.length;
      if (length >= size) break;
    }
  } finally {
    stream.destroy();
  }
  return hash.digest().toString('base64');
}
