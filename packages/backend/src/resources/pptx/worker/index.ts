import { workerData } from 'node:worker_threads';

import type { PptxBuildType } from '../schema.js';

import { createWorkerLogger } from '../../../logging/worker-logger.js';
import { OoxmlReader } from '../../../services/ooxml-reader.js';
import { standaloneExit } from '../../../utils/worker-exit.js';
import { buildPresentation } from '../elements.js';
import { PptxGenJs } from '../pptxgenjs.js';

const logger = createWorkerLogger();

/** Worker input: `{ operation: 'build', payload: PptxBuildType }` from WorkerService. */
type WorkerInput = { operation?: string; payload: PptxBuildType };

const data = workerData as WorkerInput;

if (data.operation === 'build') {
  try {
    const pres = new PptxGenJs();
    const buffer = await buildPresentation(pres, data.payload);
    // Refuse to emit a corrupt deck: a valid container is the only acceptable output.
    const parts = OoxmlReader.readParts(buffer);
    if (!parts.has('ppt/presentation.xml')) {
      throw new Error('missing ppt/presentation.xml in output');
    }
    // Exit only once the bytes are flushed; an early exit(0) would truncate the output.
    process.stdout.write(buffer, () => standaloneExit(0));
  } catch (error: unknown) {
    logger.error({ err: error }, 'pptx build failed');
    standaloneExit(1);
  }
} else {
  logger.error({ operation: data.operation }, 'unsupported worker operation');
  standaloneExit(1);
}
