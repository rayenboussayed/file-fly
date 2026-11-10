import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

import { AudioService } from './audio.service.js';

describe('AudioService', () => {
  it('covers metadata, processor, and stats', async () => {
    const workerService = {
      createWorker: vi.fn(async () => Readable.from([JSON.stringify({ duration: 1 })])),
    };
    const service = new AudioService(workerService as never, {
      fileSignature: () => ({ get: () => ({ ext: 'mp3', mime: 'audio/mpeg' }) }),
    } as never);

    await expect(service.metadata()).resolves.toEqual({ duration: 1 });
    const processor = await service.processor({ payload: {} as never });
    expect(processor).toBeDefined();
    await expect(service.stats()).resolves.toEqual({ duration: 1 });
  });

  it('rejects unsupported input', async () => {
    const workerService = { createWorker: vi.fn() };
    const service = new AudioService(workerService as never, {
      fileSignature: () => ({ get: () => ({ ext: 'mid', mime: 'audio/midi' }) }),
    } as never);
    await expect(service.metadata()).rejects.toBeTruthy();
    await expect(service.processor({ payload: {} as never })).rejects.toBeTruthy();
    await expect(service.stats()).rejects.toBeTruthy();
  });
});