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
    const audio = await service.audio({ payload: { format: 'mp3' } as never });
    expect(audio).toBeDefined();
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
describe('VideoService uncovered paths', () => {
  it('covers dna with a worker-built response', async () => {
    const workerService = {
      createWorker: vi.fn(async () => Readable.from([JSON.stringify({ algorithm: 'vid-pdq' })])),
    };
    const service = new VideoService(
      workerService as never,
      { fileSignature: () => ({ get: () => ({ ext: 'mp4', mime: 'video/mp4' }) }) } as never,
      { isVideo: () => true } as never,
    );
    await expect(service.dna()).resolves.toEqual({ algorithm: 'vid-pdq' });
  });

  it('rejects with 415 when the file signature is missing or not video', async () => {
    const workerService = { createWorker: vi.fn() };
    const service = new VideoService(
      workerService as never,
      { fileSignature: () => ({ get: () => {} }) } as never,
      { isVideo: () => true } as never,
    );
    await expect(service.dna()).rejects.toMatchObject({ status: 415 });
    await expect(service.metadata()).rejects.toMatchObject({ status: 415 });
    await expect(service.stats()).rejects.toMatchObject({ status: 415 });
    await expect(service.processor({ payload: {} as never })).rejects.toMatchObject({ status: 415 });
    await expect(service.screenshot({ payload: { frames: '0' } as never })).rejects.toMatchObject({ status: 415 });
    await expect(service.audio({ payload: { format: 'mp3' } as never })).rejects.toMatchObject({ status: 415 });
  });

  it('rejects screenshot when the signature is not a video', async () => {
    const workerService = { createWorker: vi.fn() };
    const service = new VideoService(
      workerService as never,
      { fileSignature: () => ({ get: () => ({ ext: 'png', mime: 'image/png' }) }) } as never,
      { isVideo: () => false } as never,
    );
    await expect(service.screenshot({ payload: { frames: '0' } as never })).rejects.toMatchObject({ status: 415 });
    await expect(service.audio({ payload: { format: 'mp3' } as never })).rejects.toMatchObject({ status: 415 });
  });
});

describe('VideoService demuxer table', () => {
  it('rejects a video whose container has no demuxer mapping (zxv) with 415', async () => {
    const workerService = { createWorker: vi.fn() };
    const service = new VideoService(
      workerService as never,
      { fileSignature: () => ({ get: () => ({ ext: 'zxv', mime: 'video/zxv' }) }) } as never,
      { isVideo: () => true } as never,
    );
    await expect(service.screenshot({ payload: { frames: '0' } as never })).rejects.toMatchObject({ status: 415 });
    await expect(service.audio({ payload: { format: 'mp3' } as never })).rejects.toMatchObject({ status: 415 });
    expect(workerService.createWorker).not.toHaveBeenCalled();
  });
});
