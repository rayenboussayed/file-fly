import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

import { VideoService } from './video.service.js';

describe('VideoService', () => {
  it('covers metadata, processor, and stats', async () => {
    const workerService = {
      createWorker: vi.fn(async () => Readable.from([JSON.stringify({ duration: 2 })])),
    };
    const service = new VideoService(workerService as never, {
      fileSignature: () => ({ get: () => ({ ext: 'mp4', mime: 'video/mp4' }) }),
    } as never);

    await expect(service.metadata()).resolves.toEqual({ duration: 2 });
    const processor = await service.processor({ payload: {} as never });
    expect(processor).toBeDefined();
    await expect(service.stats()).resolves.toEqual({ duration: 2 });
  });
});