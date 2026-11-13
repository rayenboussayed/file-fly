import { createHash } from 'node:crypto';

/**
 * Build a deterministic multipart boundary string for a screenshot response.
 * @param frames Frame timestamps included in the response.
 * @returns Boundary string.
 */
export function screenshotBoundary(frames: readonly number[]): string {
  const hash = createHash('sha256').update(frames.join(',')).digest('hex').slice(0, 32);
  return `file-fly-screenshot-${hash}`;
}

/**
 * Write a multipart part header for a single screenshot frame.
 * @param index Zero-based frame index.
 * @param time Frame timestamp in seconds.
 * @param length Byte length of the frame image.
 * @param boundary Multipart boundary string.
 * @returns Header buffer.
 */
export function writePartHeader(index: number, time: number, length: number, boundary: string): Buffer {
  return Buffer.from(
    `--${boundary}\r\n` +
      `Content-Type: image/jpeg\r\n` +
      `Content-Disposition: inline; filename="frame-${index}.jpg"\r\n` +
      `X-Frame-Time: ${time}\r\n` +
      `Content-Length: ${length}\r\n\r\n`,
  );
}

/**
 * Write the multipart terminator for a screenshot response.
 * @param boundary Multipart boundary string.
 * @returns Terminator buffer.
 */
export function writeTerminator(boundary: string): Buffer {
  return Buffer.from(`--${boundary}--\r\n`);
}