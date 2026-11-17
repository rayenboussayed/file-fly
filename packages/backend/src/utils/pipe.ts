// eslint-disable-next-line n/no-extraneous-import
import type { FastifyReply } from 'fastify';
import type { Readable } from 'node:stream';

import { Logger } from '@nestjs/common';

import { drainStream } from './drain.js';

const logger = new Logger('pipeToReply');

/**
 * Streams a processed media stream into the raw HTTP response.
 *
 * Once headers are sent there is nothing left to report to the client, so
 * errors (worker failure, client disconnect) are logged and the raw response
 * is destroyed instead of being rethrown into the exception filter.
 *
 * Unlike `pipeline()`, a destination failure does NOT destroy `source`: the
 * remainder is drained to EOF instead. A destroyed branch would stall the
 * sibling branch of the `jutilities` tee that feeds the cache writer, so the
 * worker output would never be persisted on early client disconnects.
 * @param source - Stream produced by a worker or served from the cache.
 * @param response - Fastify reply wrapping the raw HTTP response.
 */
export async function pipeToReply(
  source: Readable,
  response: FastifyReply,
): Promise<void> {
  const { raw } = response;

  let settled = false;
  await new Promise<void>((resolve) => {
    /**
     * Settles the pump exactly once.
     * @param failed - Whether the stream failed (rather than finished cleanly).
     * @param error - The error that caused the failure, if any.
     */
    const finish = (failed: boolean, error?: unknown) => {
      if (settled) return;
      settled = true;
      if (!failed) {
        resolve();
        return;
      }
      logger.warn(`stream ended with error: ${String(error)}`);
      raw.destroy();
      source.unpipe(raw);
      // `pipeline()` would destroy the source here; drop the remainder to
      // /dev/null so the sibling tee branch (cache persist) still sees EOF.
      drainStream(source)
        .then(() => resolve())
        .catch(() => resolve());
    };
    source.once('error', (error: Error) => finish(true, error));
    raw.once('error', (error: Error) => finish(true, error));
    // 'close' fires on both clean endings and aborted connections; the
    // `source.once('end')` listener wins on the clean path via `settled`.
    raw.once('close', () => finish(true));
    source.once('end', () => finish(false));
    source.pipe(raw);
  });
}
