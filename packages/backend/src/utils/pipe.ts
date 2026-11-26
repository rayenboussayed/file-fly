// eslint-disable-next-line n/no-extraneous-import
import type { FastifyReply } from 'fastify';
import type { Readable, Transform } from 'node:stream';

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
 * @param outMeter - Optional pass-through transform placed between the source
 * and the raw response to count streamed bytes (see `createOutMeter`).
 */
export async function pipeToReply(
  source: Readable,
  response: FastifyReply,
  outMeter?: Transform,
): Promise<void> {
  const { raw } = response;
  // With a meter, the meter is both the drain target (on failure) and the
  // stream whose 'end' completes the pump; without one, the source plays both.
  const endStream = outMeter ?? source;

  let isSettled = false;
  await new Promise<void>((resolve) => {
    /**
     * Settles the pump exactly once.
     * @param isFailed - Whether the stream failed (rather than finished cleanly).
     * @param error - The error that caused the failure, if any.
     */
    const finish = (isFailed: boolean, error?: unknown) => {
      if (isSettled) return;
      isSettled = true;
      if (!isFailed) {
        resolve();
        return;
      }
      logger.warn(`stream ended with error: ${String(error)}`);
      raw.destroy();
      if (outMeter) {
        outMeter.unpipe(raw);
        outMeter.destroy();
      } else {
        source.unpipe(raw);
      }
      // `pipeline()` would destroy the source here; drop the remainder to
      // /dev/null so the sibling tee branch (cache persist) still sees EOF.
      void (async () => {
        try {
          await drainStream(source);
        } catch {
          void 0;
        }
        resolve();
      })();
    };
    source.once('error', (error: Error) => finish(true, error));
    outMeter?.once('error', (error: Error) => finish(true, error));
    raw.once('error', (error: Error) => finish(true, error));
    // 'finish' means everything written to this response was flushed;
    // it can race raw 'close' on a clean completion.
    raw.once('finish', () => finish(false));
    // 'close' fires on both clean endings and aborted connections; the
    // `endStream.once('end')` listener wins on the clean path via `settled`.
    raw.once('close', () => finish(true));
    endStream.once('end', () => finish(false));
    if (outMeter) {
      source.pipe(outMeter);
      outMeter.pipe(raw);
      return;
    }
    source.pipe(raw);
  });
}
