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
  cls.sourceStream().set(body);
}
