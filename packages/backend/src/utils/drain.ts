import type { Readable } from 'node:stream';

import { toBuffer } from 'jutilities/to';

/**
 * Discards the unread remainder of a stream without buffering it.
 *
 * Callers always consume to EOF, which is why this uses an async iterator:
 * a `'data'` listener cannot drain streams that are paused with pending read
 * requests (e.g. `process.stdin` inside a worker after Demuxer reads). The
 * iterator's implicit `return()` destroys the stream only at EOF, after
 * `source` has ended — late enough that any sibling tee branch is done.
 * @param stream - Stream to drop to EOF.
 * @returns The number of bytes discarded.
 */
export async function drainStream(stream: Readable): Promise<number> {
  let dropped = 0;
  for await (const chunk of stream) {
    dropped += toBuffer(chunk).byteLength;
  }
  return dropped;
}
