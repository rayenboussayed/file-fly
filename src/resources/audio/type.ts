import type { DemuxerFormat } from '@/constants/av-formats.js';

import type { AudioProcessorType as SchemaAudioProcessorType } from './schema.js';

export type AudioWorkerData =
  | {
      inputFormat?: DemuxerFormat;
      operation: 'metadata' | 'stats';
      payload?: never;
    }
  | {
      inputFormat?: DemuxerFormat;
      operation: 'processor';
      payload: SchemaAudioProcessorType;
    };