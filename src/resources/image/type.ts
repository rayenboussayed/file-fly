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

/**
 * Text recognition result returned by `GET|POST /image/ocr`.
 */
export interface ImageOcrResult {
  /** Overall confidence, 0-100, rounded to two decimals. */
  confidence: number;
  /** Wall time to acquire a worker and recognize the image (pool queue wait included), integer ms. */
  durationMs: number;
  /** Normalized (lowercased, deduped, sorted) language codes that were used, at most 4. */
  langs: string[];
  /** Per-line breakdown in reading order; words are omitted to keep payloads small. */
  lines: Array<{ confidence: number; text: string }>;
  /** Full extracted text, trailing newline removed. */
  text: string;
}

export type ImageWorkerData =
  | {
      operation: 'metadata' | 'stats';
      payload?: never;
    }
  | {
      operation: 'processor';
      payload: ImageProcessorType;
    };
