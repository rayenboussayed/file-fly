import { workerData } from 'node:worker_threads';

import type { VideoWorkerData } from '../type.js';

import { createWorkerLogger } from '../../../logging/worker-logger.js';
import { dna } from './dna.js';
import { metadata, stats } from './inspect.js';
import { processMedia } from './processor.js';
import { screenshot } from './screenshot.js';

const logger = createWorkerLogger();

const data: VideoWorkerData = workerData;

/**
 * Ends the worker process once the job is done: drops the stdin handle so
 * the event loop drains naturally, with a short backstop if native handles linger.
 * @param code - Exit code for the worker process.
 */
function finishWorker(code: number) {
  process.exitCode = code;
  process.stdin.destroy();
  // eslint-disable-next-line n/no-process-exit -- native media handles can keep the worker alive; this is the bounded backstop.
  setTimeout(() => process.exit(code), 250).unref();
}

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
