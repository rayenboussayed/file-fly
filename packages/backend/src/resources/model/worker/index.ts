import { workerData } from 'node:worker_threads';

import type { ModelOptimizeType } from '../schema.js';

import { createWorkerLogger } from '../../../logging/worker-logger.js';
import { standaloneExit } from '../../../utils/worker-exit.js';
import { optimizeDocument, readModel, writeGlb } from '../gltf.js';

const logger = createWorkerLogger();

/**
Worker input: { operation: 'optimize', payload: { buffer, query } } from WorkerService.
 */
type WorkerInput = { operation?: string; payload: { buffer: Buffer; query: ModelOptimizeType } };

// workerData is set exclusively by ModelService.optimize's createWorker call with this exact shape.
const data = workerData as WorkerInput;

if (data.operation === 'optimize') {
  try {
    const document = await readModel(data.payload.buffer);
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
    process.stdout.write(out, () => standaloneExit(0));
  } catch (error: unknown) {
    logger.error({ err: error }, 'model optimize failed');
    standaloneExit(1);
  }
} else {
  logger.error({ operation: data.operation }, 'unknown worker operation');
  standaloneExit(1);
}
