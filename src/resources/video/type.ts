import type { DemuxerFormat } from '@/constants/av-formats.js';

import type { VideoProcessorType as SchemaVideoProcessorType } from './schema.js';

export type VideoWorkerData =
  | {
      inputFormat?: DemuxerFormat;
      operation: 'metadata' | 'stats';
      payload?: never;
    }
  | {
      inputFormat?: DemuxerFormat;
      operation: 'processor';
      payload: SchemaVideoProcessorType;
    };