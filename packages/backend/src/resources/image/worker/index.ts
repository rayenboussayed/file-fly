import { workerData } from 'node:worker_threads';

import type { ImageWorkerData } from '../type.js';

import { createWorkerLogger } from '../../../logging/worker-logger.js';
import { exitWorker as finishWorker } from '../../../utils/worker-exit.js';
import { metadata, stats } from './inspect.js';
import { Processor } from './processor.js';

const logger = createWorkerLogger();

const data: ImageWorkerData = workerData;

/**
 * Dispatches the requested image operation (processor/metadata/stats).
 * @param inputData - Worker dispatch data (defaults to the spawned worker's workerData).
 */
export async function runImageWorker(inputData: ImageWorkerData = data) {
  switch (inputData.operation) {
    case 'metadata':
      await metadata();
      break;
    case 'processor':
      await new Processor().process(inputData.payload);
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
export async function startImageWorker() {
  const job = runImageWorker(data);
  if (process.env.FILE_FLY_WORKER !== '1') {
    try {
      await job;
    } catch (error) {
      logger.debug({ err: error }, 'worker job failed');
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

void startImageWorker().catch(() => {});
