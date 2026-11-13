import { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import sharp from 'sharp';

/**
 * A Writable that discards everything written to it, used to consume an image
 * stream while sharp gathers metadata/stats (so the image bytes never reach stdout).
 */
class Discard extends Writable {
  override _write(_chunk: Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    callback();
  }
}

/**
 *
 */
export async function metadata() {
  const transformer = sharp();
  const metadataPromise = transformer.metadata();

  const pipePromise = pipeline(process.stdin, transformer, new Discard());
  transformer.resume();

  const metadata = await pipePromise.then(() => metadataPromise);
  process.stdout.end(JSON.stringify(metadata));
}

/**
 *
 */
export async function stats() {
  const transformer = sharp();
  const statsPromise = transformer.stats();

  const pipePromise = pipeline(process.stdin, transformer, new Discard());
  transformer.resume();

  const stats = await pipePromise.then(() => statsPromise);
  process.stdout.end(JSON.stringify(stats));
}
