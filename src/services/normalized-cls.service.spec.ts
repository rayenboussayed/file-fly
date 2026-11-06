import { CLS_REQ, CLS_RES } from 'nestjs-cls';
import { describe, expect, it } from 'vitest';

import { NormalizedClsService } from './normalized-cls.service.js';

describe('NormalizedClsService', () => {
  it('delegates to cls', () => {
    const store = new Map<symbol, unknown>();
    store.set(CLS_REQ, { id: 'request' });
    store.set(CLS_RES, { id: 'response' });
    const cls = {
      get: <T>(key: symbol) => store.get(key) as T,
      set: (key: symbol, value: unknown) => store.set(key, value),
    };
    const service = new NormalizedClsService(cls as never);
    service.cacheKey().set('k');
    expect(service.cacheKey().get()).toBe('k');
    service.fileHash().unset();
    expect(service.fileHash().get()).toBeUndefined();
    service.fileSignature().set({ mime: 'image/png' } as never);
    expect(service.fileSignature().get()?.mime).toBe('image/png');
    expect(service.request()).toEqual({ id: 'request' });
    expect(service.response()).toEqual({ id: 'response' });
    expect(service.sourceDirection().get()).toBeUndefined();
    service.sourceStream().set('s' as never);
    expect(service.sourceStream().get()).toBe('s');
  });
});