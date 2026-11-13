import type { Readable } from 'node:stream';

import { PayloadTooLargeException } from '@nestjs/common';
import { streamSize } from 'jutilities/node-stream';

/** Maximum number of bytes buffered from a stream (20 MiB). */
const MAX_BUFFER_BYTES = 20 * 1024 * 1024;

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
  for await (const chunk of streamSize(stream, {
    onSize: ({ size }) => {
      if (size > maxBytes) {
        // Throwing inside the callback rejects the generator iteration.
        throw new PayloadTooLargeException(`Input exceeds ${maxBytes} bytes`);
      }
    },
  })) {
    // The async generator yields `any`; narrow to Buffer/Uint8Array/string here.
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array));
  }
  return Buffer.concat(chunks);
}
