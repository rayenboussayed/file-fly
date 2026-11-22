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
      audio: vi.fn(async () => Readable.from([])),
      dna: vi.fn(async () => ({ dna: true })),
      metadata: vi.fn(async () => ({ ok: true })),
      processor: vi.fn(async () => processed),
      screenshot: vi.fn(async () => processed),
      stats: vi.fn(async () => ({ stats: true })),
    };
    const cls = { bytesOut: () => ({ set: vi.fn() }) };
    const controller = new VideoController(videoService as never, cls as never);
    const response = { raw: rawSink(), type: vi.fn() };

    await expect(controller.metadataGet()).resolves.toEqual({ ok: true });
    await expect(controller.metadataPost()).resolves.toEqual({ ok: true });
    await expect(controller.statsGet()).resolves.toEqual({ stats: true });
    await expect(controller.statsPost()).resolves.toEqual({ stats: true });
    await controller.main(response as never, {} as never);
    expect(videoService.processor).toHaveBeenCalled();

    const audioResponse = { raw: rawSink(), type: vi.fn() };
    await controller.audioGet(audioResponse as never, { format: 'mp3' } as never);
    await controller.audioPost(audioResponse as never, { format: 'mp3' } as never);
    expect(videoService.audio).toHaveBeenCalledTimes(2);
    expect(audioResponse.raw.setHeader).toHaveBeenCalledWith('content-type', 'audio/mpeg');

    await expect(controller.dnaGet()).resolves.toEqual({ dna: true });
    await expect(controller.dnaPost()).resolves.toEqual({ dna: true });

    const getResponse = { raw: rawSink(), type: vi.fn() };
    await controller.mainGet(getResponse as never, {} as never);
    await controller.mainPost(getResponse as never, {} as never);
    expect(videoService.processor).toHaveBeenCalledTimes(3);

    const screenshotResponse = { raw: rawSink(), type: vi.fn() };
    await controller.screenshot(screenshotResponse as never, { frames: '1,2' } as never);
    expect(videoService.screenshot).toHaveBeenCalled();
    expect(screenshotResponse.raw.setHeader).toHaveBeenCalledWith('content-type', expect.stringContaining('multipart/mixed'));

    const getScreenshot = { raw: rawSink(), type: vi.fn() };
    await controller.screenshotGet(getScreenshot as never, { frames: '1' } as never);
    await controller.screenshotPost(getScreenshot as never, { frames: '1' } as never);
    expect(videoService.screenshot).toHaveBeenCalledTimes(3);
  });
});