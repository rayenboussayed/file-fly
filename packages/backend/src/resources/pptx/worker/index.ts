import { workerData } from 'node:worker_threads';

import type { PptxBuildType } from '../schema.js';

import { createWorkerLogger } from '../../../logging/worker-logger.js';
import { OoxmlReader } from '../../../services/ooxml-reader.js';
import { exitWorker } from '../../../utils/worker-exit.js';
import { buildPresentation } from '../elements.js';
import { PptxGenJs } from '../pptxgenjs.js';

const logger = createWorkerLogger();

/** Worker input: `{ operation: 'build', payload: PptxBuildType }` from WorkerService. */
type WorkerInput = { operation?: string; payload: PptxBuildType };

const runStandalone = process.env.FILE_FLY_WORKER === '1';

/**
 * Ends the worker with a clean exit, dropping the stdin handle so the event loop
 * drains, with a short backstop for native handles.
 * @param code - Exit code.
 */
const finishWorker = (code: number) => {
  if (runStandalone) exitWorker(code); // unit specs import the module in-process
};

const data = workerData as WorkerInput;

if (data.operation !== 'build') {
  logger.error({ operation: data.operation }, 'unsupported worker operation');
  finishWorker(1);
} else {
  const pres = new PptxGenJs();
  buildPresentation(pres, data.payload)
    .then((buffer) => {
      // Refuse to emit a corrupt deck: a valid container is the only acceptable output.
      const parts = OoxmlReader.readParts(buffer);
      if (!parts.has('ppt/presentation.xml')) {
        throw new Error('missing ppt/presentation.xml in output');
      }
      // Exit only once the bytes are flushed; an early exit(0) would truncate the output.
      process.stdout.write(buffer, () => finishWorker(0));
      return buffer;
    })
    .catch((error: unknown) => {
      logger.error({ err: error }, 'pptx build failed');
      finishWorker(1);
    });
}
