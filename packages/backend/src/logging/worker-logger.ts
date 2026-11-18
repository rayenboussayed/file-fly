import type { Writable } from 'node:stream';

import pino, { type Logger } from 'pino';

import { buildPinoOptions } from './pino-options.js';

/**
 * Creates the logger for worker threads. Worker stdout is the byte channel for
 * generated media and documents, so all worker logs go to stderr only.
 * @param destination - Stream to write JSON lines to; defaults to `process.stderr`.
 * @returns A pino instance emitting one JSON object per line.
 */
export function createWorkerLogger(
  destination: Writable = process.stderr,
): Logger {
  return pino(
    {
      ...buildPinoOptions({ isProduction: true, level: process.env.LOG_LEVEL ?? 'error' }),
    },
    destination,
  );
}
