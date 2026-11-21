import { workerData } from 'node:worker_threads';

import type { AudioWorkerData } from '../type.js';

import { createWorkerLogger } from '../../../logging/worker-logger.js';
import { exitWorker as finishWorker } from '../../../utils/worker-exit.js';
import { dna } from './dna.js';
import { metadata, stats } from './inspect.js';
import { processMedia } from './processor.js';

const logger = createWorkerLogger();

const data: AudioWorkerData = workerData;

/**
 * Dispatches the requested audio operation (processor/metadata/dna/stats).
 * @param inputData - Worker dispatch data (defaults to the spawned worker's workerData).
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
      logger.error({ err: error }, 'worker failed');
      finishWorker(1);
    },
  );
}

void startAudioWorker().catch(() => undefined);
