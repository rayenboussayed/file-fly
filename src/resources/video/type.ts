import type { VideoProcessorType as SchemaVideoProcessorType } from './schema.js';

export type VideoWorkerData =
  | {
      inputFormat: string;
      operation: 'dna' | 'metadata' | 'stats';
      payload?: never;
    }
  | {
      inputFormat: string;
      operation: 'processor';
      payload: SchemaVideoProcessorType;
    }
  | {
      inputFormat: string;
      operation: 'screenshot';
      payload: { frames: number[] };
    };