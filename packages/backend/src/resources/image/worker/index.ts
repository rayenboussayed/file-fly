import { workerData } from 'node:worker_threads';

import type { ImageWorkerData } from '../type.js';

import { createWorkerLogger } from '../../../logging/worker-logger.js';
import { metadata, stats } from './inspect.js';
import { Processor } from './processor.js';

const logger = createWorkerLogger();

const data: ImageWorkerData = workerData;

/**
 * Ends the worker process once the job is done: drops the stdin handle so
 * the event loop drains naturally, with a short backstop if native handles linger.
 * @param code - Exit code for the worker process.
 */
export function finishWorker(code: number) {
  process.exitCode = code;
  process.stdin.destroy();
  // eslint-disable-next-line n/no-process-exit -- native media handles can keep the worker alive; this is the bounded backstop.
  setTimeout(() => process.exit(code), 250).unref();
}

/**
 *
// eslint-disable-next-line jsdoc/require-param-description
 * @param inputData Description.
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
 * @returns Result.
 */
export function startImageWorker() {
  const job = runImageWorker(data);
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

void startImageWorker().catch(() => undefined);
