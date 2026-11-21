import { workerData } from 'node:worker_threads';

import type { ModelOptimizeType } from '../schema.js';

import { createWorkerLogger } from '../../../logging/worker-logger.js';
import { exitWorker } from '../../../utils/worker-exit.js';
import { optimizeDocument, readModel, writeGlb } from '../gltf.js';

const logger = createWorkerLogger();
const runStandalone = process.env.FILE_FLY_WORKER === '1';

/** Worker input: { operation: 'optimize', payload: { buffer, query } } from WorkerService. */
type WorkerInput = { operation?: string; payload: { buffer: Buffer; query: ModelOptimizeType } };

/**
 * Commits the worker's exit code; stdout exit is deferred so flush can complete.
 * @param code - The exit code to report.
 */
const finishWorker = (code: number) => {
  if (runStandalone) exitWorker(code); // unit specs import the module in-process
};

// workerData is set exclusively by ModelService.optimize's createWorker call with this exact shape.
const data = workerData as WorkerInput;

if (data.operation === 'optimize') {
  readModel(data.payload.buffer)
    .then(async (document) => {
      await optimizeDocument(document, data.payload.query);
      const out = await writeGlb(document);
      // Refuse to emit a corrupt document: a readable GLB is the only acceptable output.
      const checked = await readModel(Buffer.from(out));
      const required = new Set(checked.getRoot().listExtensionsRequired().map((extension) => extension.extensionName));
      const used = new Set(checked.getRoot().listExtensionsUsed().map((extension) => extension.extensionName));
      for (const name of required) {
        if (!used.has(name)) {
          throw new Error(`optimizer output is missing required extension: ${name}`);
        }
      }
      // Exit only once the bytes are flushed; an early exit(0) would truncate the output.
      process.stdout.write(out, () => finishWorker(0));
      return out;
    })
    .catch((error: unknown) => {
      logger.error({ err: error }, 'model optimize failed');
      finishWorker(1);
    });
} else {
  logger.error({ operation: data.operation }, 'unknown worker operation');
  finishWorker(1);
}
