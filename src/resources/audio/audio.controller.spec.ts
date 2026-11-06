import { Readable, Writable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

import { AudioController } from './audio.controller.js';

describe('AudioController', () => {
  it('covers metadata, stats, and main', async () => {
    const processed = Readable.from([]);
    const audioService = {
      metadata: vi.fn(async () => ({ ok: true })),
      processor: vi.fn(async () => processed),
      stats: vi.fn(async () => ({ stats: true })),
    };
    const controller = new AudioController(audioService as never);
    const request = { signal: new AbortController().signal };
    const response = { raw: new Writable({ write(_c,_e,cb){cb();} }), type: vi.fn() };

    await expect(controller.metadataGet(request as never)).resolves.toEqual({ ok: true });
    await expect(controller.metadataPost(request as never)).resolves.toEqual({ ok: true });
    await expect(controller.statsGet(request as never)).resolves.toEqual({ stats: true });
    await expect(controller.statsPost(request as never)).resolves.toEqual({ stats: true });
    await controller.main(request as never, response as never, {} as never);
    expect(audioService.processor).toHaveBeenCalled();
  });
});