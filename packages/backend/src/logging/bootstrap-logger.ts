import pino from 'pino';

import { environment, isProduction } from '../environment.js';
import { buildPinoOptions } from './pino-options.js';

/**
 * Process-level logger for fatal paths that run before Nest's dependency injection
 * exists (unhandled rejections, uncaught exceptions). Always raw JSON to stdout;
 * never pretty-printed, so early fatals are machine-parseable.
 */
export const bootstrapLogger = pino(
  buildPinoOptions({ isProduction, level: environment.LOG_LEVEL }),
);
