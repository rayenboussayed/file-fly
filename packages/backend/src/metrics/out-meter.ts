import { streamSizeTransform } from 'jutilities/node/stream/size';

import type { NormalizedClsService } from '@/services/normalized-cls.service.js';

/**
 * Creates the pass-through meter counting streamed response bytes into CLS.
 *
 * The transform forwards chunks unchanged (no copies) and stores the cumulative
 * byte count in CLS; the metrics interceptor reads it once the client closes.
 * @param cls - CLS service carrying the request context.
 * @returns A Transform placed between the source stream and the raw response.
 */
export function createOutMeter(cls: NormalizedClsService) {
  return streamSizeTransform({
    onSize: ({ size }) => cls.bytesOut().set(size),
  });
}
