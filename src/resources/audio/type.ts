import type { AudioProcessorType as SchemaAudioProcessorType } from './schema.js';

export type AudioWorkerData =
  | {
      inputFormat: string;
      operation: 'metadata' | 'stats';
      payload?: never;
    }
  | {
      inputFormat: string;
      operation: 'processor';
      payload: SchemaAudioProcessorType;
    };