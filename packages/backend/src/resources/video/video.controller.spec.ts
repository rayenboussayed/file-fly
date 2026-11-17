import { Readable, Writable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

import { VideoController } from './video.controller.js';


/**
 * Creates a Writable raw sink with a `setHeader` mock for assertions.
 * @returns A writable with a mocked `setHeader`.
 */
function rawSink(): Writable & { setHeader: ReturnType<typeof vi.fn> } {
  const raw = new Writable({ write(_chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) { callback(); } });
  const setHeader = vi.fn();
  return Object.assign(raw, { setHeader }) as Writable & { setHeader: ReturnType<typeof vi.fn> };
}

describe('VideoController', () => {
  it('covers metadata, stats, main, and screenshot', async () => {
    const processed = Readable.from([]);
    const videoService = {
      metadata: vi.fn(async () => ({ ok: true })),
      processor: vi.fn(async () => processed),
      screenshot: vi.fn(async () => processed),
      stats: vi.fn(async () => ({ stats: true })),
    };
    const controller = new VideoController(videoService as never);
    const response = { raw: rawSink(), type: vi.fn() };

    await expect(controller.metadataGet()).resolves.toEqual({ ok: true });
    await expect(controller.metadataPost()).resolves.toEqual({ ok: true });
    await expect(controller.statsGet()).resolves.toEqual({ stats: true });
    await expect(controller.statsPost()).resolves.toEqual({ stats: true });
    await controller.main(response as never, {} as never);
    expect(videoService.processor).toHaveBeenCalled();
    const screenshotResponse = { raw: rawSink(), type: vi.fn() };
    await controller.screenshot(screenshotResponse as never, { frames: '1,2' } as never);
    expect(videoService.screenshot).toHaveBeenCalled();
    expect(screenshotResponse.raw.setHeader).toHaveBeenCalledWith('content-type', expect.stringContaining('multipart/mixed'));
  });
});