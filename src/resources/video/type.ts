import type { VideoProcessorType as SchemaVideoProcessorType } from './schema.js';

export type VideoWorkerData =
  | {
      inputFormat?: string;
      operation: 'metadata' | 'stats';
      payload?: never;
    }
  | {
      inputFormat?: string;
      operation: 'processor';
      payload: SchemaVideoProcessorType;
    };