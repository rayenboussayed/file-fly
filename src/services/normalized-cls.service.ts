import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Readable } from 'node:stream';

import { Injectable } from '@nestjs/common';
import { FileTypeResult } from 'file-type';
import { CLS_REQ, CLS_RES, ClsService } from 'nestjs-cls';

import {
  CLS_CACHE_KEY,
  CLS_FILE_HASH,
  CLS_FILE_SIGNATURE,
  CLS_SOURCE_DIRECTION,
  CLS_SOURCE_STREAM,
} from '@/constants/cls.js';

@Injectable()
export class NormalizedClsService {
  constructor(private readonly cls: ClsService) {}

  cacheKey() {
    return this.mange<string>(CLS_CACHE_KEY);
  }

  fileHash() {
    return this.mange<string>(CLS_FILE_HASH);
  }

  fileSignature() {
    return this.mange<FileTypeResult>(CLS_FILE_SIGNATURE);
  }

  request() {
    return this.cls.get<FastifyRequest>(CLS_REQ);
  }

  response() {
    return this.cls.get<FastifyReply>(CLS_RES);
  }

  sourceDirection() {
    return this.mange<'download' | 'upload'>(CLS_SOURCE_DIRECTION);
  }

  sourceStream() {
    return this.mange<Readable>(CLS_SOURCE_STREAM);
  }

  private readonly mange = <T>(key: symbol) => {
    return {
      get: () => this.cls.get<T>(key),
      set: (value: T) => this.cls.set(key, value),
      unset: () => this.cls.set(key, undefined),
    };
  };
}