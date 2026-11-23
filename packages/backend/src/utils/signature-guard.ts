import {
  type CallHandler,
  UnsupportedMediaTypeException,
} from '@nestjs/common';

import type { NormalizedClsService } from '@/services/normalized-cls.service.js';

/**
 * A function that decides whether a probed mime belongs to a media family.
 * @param mime - The probed content type.
 * @returns `true` when the mime is accepted for the family.
 */
type SignaturePredicate = (mime: string) => boolean;

/**
 * Shared guard used by the media signature interceptors: rejects a request whose
 * probed signature is not a member of the expected media family.
 *
 * The check is a no-op for routes whose URL does not start with `prefix`; for
 * matching routes with a probed signature that fails `isAllowed`, an
 * {@link UnsupportedMediaTypeException} carrying `message` is thrown. Routes
 * without a probed signature pass through untouched (the probe happens earlier).
 * @param prefix - Route prefix to gate (e.g. `'/audio'`).
 * @param isAllowed - {@link FileTypeService} predicate for the media family.
 * @param message - Exact error message thrown on rejection.
 * @param cls - Normalized CLS service carrying the current request context.
 * @param next - Call handler used to continue the pipeline.
 * @returns The observable produced by continuing the pipeline.
 * @throws {UnsupportedMediaTypeException} When the probed signature is not allowed.
 */
export function guardSignature(
  prefix: string,
  isAllowed: SignaturePredicate,
  message: string,
  cls: NormalizedClsService,
  next: CallHandler,
): ReturnType<CallHandler['handle']> {
  const request = cls.request();
  if (!request.url.startsWith(prefix)) return next.handle();
  const signature = cls.fileSignature().get();
  if (signature && !isAllowed(signature.mime)) {
    throw new UnsupportedMediaTypeException(message);
  }
  return next.handle();
}
