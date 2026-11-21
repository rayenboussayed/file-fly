import { workerData } from 'node:worker_threads';

import type { VideoWorkerData } from '../type.js';

import { createWorkerLogger } from '../../../logging/worker-logger.js';
import { exitWorker as finishWorker } from '../../../utils/worker-exit.js';
import { dna } from './dna.js';
import { metadata, stats } from './inspect.js';
import { processMedia } from './processor.js';
import { screenshot } from './screenshot.js';

const logger = createWorkerLogger();

const data: VideoWorkerData = workerData;

/** Dispatches the requested video operation (processor/metadata/dna/stats/screenshot). */
async function run() {
  switch (data.operation) {
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
function startVideoWorker() {
  const job = run();
  if (process.env.FILE_FLY_WORKER !== '1') {
    return job.catch(() => undefined);
  }
  return job.then(
    () => finishWorker(0),
    (error: unknown) => {
      logger.error({ err: error }, 'worker failed');
      finishWorker(1);
    },
  );
}

void startVideoWorker().catch(() => undefined);
