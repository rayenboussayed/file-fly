import type { Readable } from 'node:stream';

import { tee } from 'jutilities/node/stream/tee';

import type { NormalizedClsService } from '@/services/normalized-cls.service.js';

/**
 * Splits the current source stream into two branches: returns one branch and
 * keeps the other as the source on the CLS store.
 * @param cls - The normalized CLS service carrying the current request context.
 * @returns One branch of the teed source stream.
 */
export function forkSource(cls: NormalizedClsService): Readable {
  const source = cls.sourceStream().get();
  if (!source) {
    throw new Error('forkSource requires an opened source stream on the CLS (call openMediaSource first)');
  }
  const [branch, rest] = tee({ stream: source });
  cls.sourceStream().set(rest);
  return branch;
}
