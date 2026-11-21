import type { Readable } from 'node:stream';

import { PayloadTooLargeException } from '@nestjs/common';
import { streamSize } from 'jutilities/node/stream/size';
import { toBuffer } from 'jutilities/to';
import { Transform, type TransformCallback } from 'node:stream';

/** Maximum number of bytes buffered from a stream (20 MiB). */
const MAX_BUFFER_BYTES = 20 * 1024 * 1024;
/** Maximum JSON payload a worker may write to stdout (8 MiB). */
const WORKER_JSON_MAX_BYTES = 8 * 1024 * 1024;

/**
 * Passes stream chunks through while rejecting anything past a byte budget.
 */
export class ByteCapTransform extends Transform {
  private bytes = 0;

  /**
   * @param maxBytes - Maximum bytes to accept before destroying the stream.
   */
  constructor(private readonly maxBytes: number) {
    super();
  }

  override _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
    this.bytes += chunk.length;
    if (this.bytes > this.maxBytes) {
      callback(new PayloadTooLargeException(`Input exceeds ${this.maxBytes} bytes`));
      return;
    }
    callback(null, chunk);
  }
}

/**
 * Buffers a readable stream into a single Buffer, enforcing a size cap.
 * @param stream The readable stream to buffer.
 * @param maxBytes The maximum number of bytes to accept before throwing.
 * @returns The concatenated buffer contents.
 */
export async function bufferStream(
  stream: Readable,
  maxBytes: number = MAX_BUFFER_BYTES,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of streamSize({
    onSize: ({ size }) => {
      if (size > maxBytes) {
        // Throwing inside the callback rejects the generator iteration.
        throw new PayloadTooLargeException(`Input exceeds ${maxBytes} bytes`);
      }
    },
    stream,
  })) {
    chunks.push(toBuffer(chunk));
  }
  return Buffer.concat(chunks);
}

/**
 * Parses a small JSON payload emitted by a worker.
 * @param buffer - UTF-8 encoded JSON bytes.
 * @returns The parsed JSON value.
 */
export function parseJsonBuffer(buffer: Buffer): unknown {
  return JSON.parse(buffer.toString('utf8').trim());
}

/**
 * Buffers and parses the small JSON payload a worker writes to stdout.
 * @param stdout - The worker's stdout stream.
 * @returns The parsed JSON value.
 */
export async function readWorkerJson(stdout: Readable): Promise<unknown> {
  // A misbehaving worker must not grow stdout unboundedly.
  return parseJsonBuffer(await bufferStream(stdout, WORKER_JSON_MAX_BYTES));
}
