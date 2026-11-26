import { CLS_REQ, CLS_RES } from 'nestjs-cls';
import { describe, expect, it } from 'vitest';

import { NormalizedClsService } from './normalized-cls.service.js';

describe('NormalizedClsService', () => {
  it('delegates to cls', () => {
    const store = new Map<symbol, unknown>([[CLS_REQ, { id: 'request' }], [CLS_RES, { id: 'response' }]]);
    const cls = {
      get: <T>(key: symbol) => store.get(key) as T,
      set: (key: symbol, value: unknown) => store.set(key, value),
    };
    const service = new NormalizedClsService(cls as never);
    service.cacheKey().set('k');
    expect(service.cacheKey().get()).toBe('k');
    service.fileHash().unset();
    expect(service.fileHash().get()).toBeUndefined();
    service.fileScan().set({ isInfected: true, viruses: ['Eicar-Test-File'] });
    expect(service.fileScan().get()?.isInfected).toBe(true);
    service.fileScan().unset();
    expect(service.fileScan().get()).toBeUndefined();
    service.fileSignature().set({ mime: 'image/png' } as never);
    expect(service.fileSignature().get()?.mime).toBe('image/png');
    expect(service.request()).toEqual({ id: 'request' });
    expect(service.response()).toEqual({ id: 'response' });
    expect(service.sourceDirection().get()).toBeUndefined();
    service.sourceStream().set('s' as never);
    expect(service.sourceStream().get()).toBe('s');
    service.bytesIn().set(64);
    expect(service.bytesIn().get()).toBe(64);
    service.bytesIn().unset();
    expect(service.bytesIn().get()).toBeUndefined();
    service.bytesOut().set(1024);
    expect(service.bytesOut().get()).toBe(1024);
    service.bytesOut().unset();
    expect(service.bytesOut().get()).toBeUndefined();
    service.cacheOutcome().set('hit');
    expect(service.cacheOutcome().get()).toBe('hit');
    service.cacheOutcome().unset();
    expect(service.cacheOutcome().get()).toBeUndefined();
  });
});