import type { ImageProcessorType } from './schema.js';

export type ImageWorkerData =
  | {
      operation: 'metadata' | 'stats';
      payload?: never;
    }
  | {
      operation: 'processor';
      payload: ImageProcessorType;
    };
