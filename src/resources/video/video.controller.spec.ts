import { Readable, Writable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

import { VideoController } from './video.controller.js';

describe('VideoController', () => {
  it('covers metadata, stats, and main', async () => {
    const processed = Readable.from([]);
    const videoService = {
      metadata: vi.fn(async () => ({ ok: true })),
      processor: vi.fn(async () => processed),
      stats: vi.fn(async () => ({ stats: true })),
    };
    const controller = new VideoController(videoService as never);
    const request = { signal: new AbortController().signal };
    const response = { raw: new Writable({ write(_c,_e,cb){cb();} }), type: vi.fn() };

    await expect(controller.metadataGet(request as never)).resolves.toEqual({ ok: true });
    await expect(controller.metadataPost(request as never)).resolves.toEqual({ ok: true });
    await expect(controller.statsGet(request as never)).resolves.toEqual({ stats: true });
    await expect(controller.statsPost(request as never)).resolves.toEqual({ stats: true });
    await controller.main(request as never, response as never, {} as never);
    expect(videoService.processor).toHaveBeenCalled();
  });
});