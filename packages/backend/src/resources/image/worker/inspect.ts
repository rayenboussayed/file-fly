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
 * Reads image metadata from stdin via sharp and writes it as JSON to stdout.
 */
export async function metadata() {
  const transformer = sharp({ limitInputPixels: 100_000_000 });
  const metadataPromise = transformer.metadata();

  const pipePromise = pipeline(process.stdin, transformer, new Discard());
  transformer.resume();

  await pipePromise;
  const metadata = await metadataPromise;
  process.stdout.end(JSON.stringify(metadata));
}

/**
 * Reads image statistics from stdin via sharp and writes them as JSON to stdout.
 */
export async function stats() {
  const transformer = sharp({ limitInputPixels: 100_000_000 });
  const statsPromise = transformer.stats();

  const pipePromise = pipeline(process.stdin, transformer, new Discard());
  transformer.resume();

  await pipePromise;
  const stats = await statsPromise;
  process.stdout.end(JSON.stringify(stats));
}
