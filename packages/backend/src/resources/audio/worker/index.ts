import { workerData } from 'node:worker_threads';

import type { AudioWorkerData } from '../type.js';

import { dna } from './dna.js';
import { metadata, stats } from './inspect.js';
import { processMedia } from './processor.js';

const data: AudioWorkerData = workerData;

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
export async function runAudioWorker(inputData: AudioWorkerData = data) {
  switch (inputData.operation) {
  case 'dna':
    await dna(inputData);
    break;
  case 'metadata':
    await metadata(inputData);
    break;
  case 'processor':
    await processMedia(inputData.payload, inputData);
    break;
  case 'stats':
    await stats(inputData);
    break;
  }
}

/**
 * Runs the worker job and, only inside a spawned worker thread, finishes the process.
 * @returns The worker job promise (resolved when the job has been dispatched).
 */
export function startAudioWorker() {
  const job = runAudioWorker(data);
  if (process.env.FILE_FLY_WORKER !== '1') {
    return job.catch(() => undefined);
  }
  return job.then(
    () => finishWorker(0),
    (error: unknown) => {
      console.error(error);
      finishWorker(1);
    },
  );
}

void startAudioWorker().catch(() => undefined);
