import { streamSizeTransform } from 'jutilities/node/stream/size';
import { request as netRequest } from 'undici';

import type { NormalizedClsService } from '@/services/normalized-cls.service.js';

import { SourceSchema } from '@/schema.js';

/**
 * Opens the media source for the current request: sets the source direction
 * (`upload` for POSTs, `download` otherwise) and the source stream on the
 * CLS store.
 *
 * Idempotent: when a source stream is already present on the CLS store the
 * call is a no-op, so interceptors bound before or after each other can both
 * rely on it without opening the source twice. Method-less requests (e.g.
 * synthetic invocations) carry no media and are left untouched.
 * @param cls - The normalized CLS service carrying the current request context.
 * @returns Resolves once the source has been opened (or skipped).
 */
export async function openMediaSource(cls: NormalizedClsService): Promise<void> {
  if (cls.sourceStream().get()) return;

  const request = cls.request();
  if (!request?.method) return; // method-less requests carry no media

  if (request.method.toUpperCase() === 'POST') {
    cls.sourceDirection().set('upload');
    cls.sourceStream().set(request.raw);
    return;
  }

  const { source } = SourceSchema.parse(request.query);
  const { body } = await netRequest(source, {
    headers: request.headers,
    method: 'GET',
    signal: request.signal,
  });
  cls.sourceDirection().set('download');
  // Meter the remote body so downloaded bytes are observable even on chunked
  // responses without a content-length header. The upload path is counted from
  // its declared content-length instead, so nothing else moves.
  const meter = streamSizeTransform({
    onSize: ({ size }) => cls.bytesIn().set(size),
  });
  // A meter failure degrades into a source failure consumers already handle.
  meter.once('error', () => body.destroy());
  body.pipe(meter);
  cls.sourceStream().set(meter);
}
