import type { AudioProcessorType as SchemaAudioProcessorType } from './schema.js';

export type AudioWorkerData =
  | {
      operation: 'metadata' | 'stats';
      payload?: never;
    }
  | {
      operation: 'processor';
      payload: SchemaAudioProcessorType;
    };