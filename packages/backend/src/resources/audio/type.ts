import type { AudioProcessorType as SchemaAudioProcessorType } from './schema.js';

/** Worker-thread payload for the audio worker; discriminated on `operation`. */
export type AudioWorkerData =
  | {
      inputFormat: string;
      operation: 'dna' | 'metadata' | 'stats';
      payload?: never;
    }
  | {
      inputFormat: string;
      operation: 'processor';
      payload: SchemaAudioProcessorType;
    };