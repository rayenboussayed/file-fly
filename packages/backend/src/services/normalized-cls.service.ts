// eslint-disable-next-line n/no-extraneous-import
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Readable } from 'node:stream';

import { Injectable } from '@nestjs/common';
import { FileTypeResult } from 'file-type';
import { lazy } from 'jutilities/lazy';
import { CLS_REQ, CLS_RES, ClsService } from 'nestjs-cls';

import {
  CLS_BYTES_IN,
  CLS_BYTES_OUT,
  CLS_CACHE_KEY,
  CLS_CACHE_OUTCOME,
  CLS_FILE_HASH,
  CLS_FILE_SCAN,
  CLS_FILE_SIGNATURE,
  CLS_SOURCE_DIRECTION,
  CLS_SOURCE_STREAM,
} from '@/constants/cls.js';

interface FileScanResult {
  isInfected: boolean;
  viruses: string[];
}

@Injectable()
export class NormalizedClsService {
  private readonly mange = lazy(<T>(key: symbol) => {
    return {
      get: () => this.cls.get<T>(key),
      set: (value: T) => this.cls.set(key, value),
      unset: () => this.cls.set(key, undefined),
    };
  });

  constructor(private readonly cls: ClsService) {}

  bytesIn() {
    return this.mange<number>(CLS_BYTES_IN);
  }

  bytesOut() {
    return this.mange<number>(CLS_BYTES_OUT);
  }

  cacheKey() {
    return this.mange<string>(CLS_CACHE_KEY);
  }

  cacheOutcome() {
    return this.mange<'hit' | 'miss'>(CLS_CACHE_OUTCOME);
  }

  fileHash() {
    return this.mange<string>(CLS_FILE_HASH);
  }

  fileScan() {
    return this.mange<FileScanResult>(CLS_FILE_SCAN);
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
}
