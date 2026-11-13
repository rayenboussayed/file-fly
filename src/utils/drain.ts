import type { Readable } from 'node:stream';

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
    if (Buffer.isBuffer(chunk)) {
      dropped += chunk.length;
    } else if (typeof chunk === 'string') {
      dropped += Buffer.byteLength(chunk);
    } else {
      dropped += (chunk as Uint8Array).byteLength;
    }
  }
  return dropped;
}
