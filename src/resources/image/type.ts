import type { ImageProcessorType } from './schema.js';

/**
 * PDQ perceptual fingerprint result returned by `GET|POST /image/dna`.
 */
export interface ImageDnaResult {
  algorithm: 'pdq';
  env: { pdqWasm: string; sharp: string };
  hash: string;
  quality: number;
  version: 'pdq@1';
}

export type ImageWorkerData =
  | {
      operation: 'metadata' | 'stats';
      payload?: never;
    }
  | {
      operation: 'ocr';
      payload?: never;
    }
  | {
      operation: 'processor';
      payload: ImageProcessorType;
    };
