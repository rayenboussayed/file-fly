import { workerData } from 'node:worker_threads';

import type { VideoWorkerData } from '../type.js';

import { createWorkerLogger } from '../../../logging/worker-logger.js';
import { exitWorker as finishWorker } from '../../../utils/worker-exit.js';
import { processMedia as processAudio } from '../../audio/worker/processor.js';
import { dna } from './dna.js';
import { metadata, stats } from './inspect.js';
import { processMedia } from './processor.js';
import { screenshot } from './screenshot.js';

const logger = createWorkerLogger();

const data: VideoWorkerData = workerData;

/** Dispatches the requested video operation (processor/audio/metadata/dna/stats/screenshot). */
async function run() {
  switch (data.operation) {
  case 'audio': {
    const payload = { ...data.payload, bitrate: data.payload.bitrate ?? '128k' };
    await processAudio(payload, { inputFormat: data.inputFormat, operation: 'processor', payload });
    break;
  }
  case 'dna':
    await dna();
    break;
  case 'metadata':
    await metadata();
    break;
  case 'processor':
    await processMedia(data.payload);
    break;
  case 'screenshot':
    await screenshot(data.payload.frames);
    break;
  case 'stats':
    await stats();
    break;
  }
}

/**
 * Runs the worker job and, only inside a spawned worker thread, finishes the process.
 * @returns The job (with exit-code handling attached when running as a worker thread).
 */
async function startVideoWorker() {
  const job = run();
  if (process.env.FILE_FLY_WORKER !== '1') {
    try {
      await job;
    } catch {
      // ignore worker errors in non-worker mode
      void 0;
    }
    return;
  }
  try {
    await job;
    finishWorker(0);
  } catch (error: unknown) {
    logger.error({ err: error }, 'worker failed');
    finishWorker(1);
  }
}

void startVideoWorker().catch(() => {});
