import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

import { VideoService } from './video.service.js';

describe('VideoService', () => {
  it('covers metadata, processor, stats, and screenshot', async () => {
    const workerService = {
      createWorker: vi.fn(async () => Readable.from([JSON.stringify({ duration: 2 })])),
    };
    const cls = {
      fileSignature: () => ({ get: () => ({ ext: 'mp4', mime: 'video/mp4' }) }),
    };
    const fileTypeService = { isVideo: () => true };
    const service = new VideoService(workerService as never, cls as never, fileTypeService as never);

    await expect(service.metadata()).resolves.toEqual({ duration: 2 });
    const processor = await service.processor({ payload: {} as never });
    expect(processor).toBeDefined();
    await expect(service.stats()).resolves.toEqual({ duration: 2 });
    const screenshot = await service.screenshot({ payload: { frames: '0.5,1' } as never });
    expect(screenshot).toBeDefined();
  });

  it('rejects unsupported input', async () => {
    const workerService = { createWorker: vi.fn() };
    const cls = {
      fileSignature: () => ({ get: () => ({ ext: 'mid', mime: 'audio/midi' }) }),
    };
    const fileTypeService = { isVideo: () => false };
    const service = new VideoService(workerService as never, cls as never, fileTypeService as never);
    await expect(service.metadata()).rejects.toThrow();
  });
});