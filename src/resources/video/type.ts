import type { VideoProcessorType as SchemaVideoProcessorType } from './schema.js';

export type VideoWorkerData =
  | {
      operation: 'metadata' | 'stats';
      payload?: never;
    }
  | {
      operation: 'processor';
      payload: SchemaVideoProcessorType;
    };