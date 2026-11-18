import { Writable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

import { PptxController } from './pptx.controller.js';

/**
 * Creates a Writable raw sink with `setHeader` mocks for assertions.
 * @returns A writable with a mocked `setHeader`.
 */
function rawSink(): Writable & { setHeader: ReturnType<typeof vi.fn> } {
  const raw = new Writable({
    write(_chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
      callback();
    },
  });
  const setHeader = vi.fn();
  return Object.assign(raw, { setHeader }) as Writable & {
    setHeader: ReturnType<typeof vi.fn>;
  };
}

describe('PptxController', () => {
  it('streams the build output as a pptx with a content disposition', async () => {
    const pptxService = {
      build: vi.fn(async () => Buffer.from('pptx-bytes')),
      extract: vi.fn(async () => ({ format: 'pptx' })),
      metadata: vi.fn(async () => ({ format: 'pptx' })),
    };
    const controller = new PptxController(pptxService as never, {} as never);
    const response = { raw: rawSink() };

    await controller.build(response as never, { layout: 'LAYOUT_16x9', slides: [] } as never);

    expect(pptxService.build).toHaveBeenCalledOnce();
    expect(response.raw.setHeader).toHaveBeenCalledWith(
      'content-type',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    );
    expect(response.raw.setHeader).toHaveBeenCalledWith(
      'content-disposition',
      'attachment; filename="export.pptx"',
    );
  });

  it('delegates extract and metadata to the service', async () => {
    const pptxService = {
      build: vi.fn(),
      extract: vi.fn(async () => ({ format: 'pptx' })),
      metadata: vi.fn(async () => ({ format: 'pptx' })),
    };
    const controller = new PptxController(pptxService as never, {} as never);

     
    await expect(controller.extract({} as never)).resolves.toEqual({ format: 'pptx' });
    expect(pptxService.extract).toHaveBeenCalledOnce();

     
    await expect(controller.metadata({} as never)).resolves.toEqual({ format: 'pptx' });
    expect(pptxService.metadata).toHaveBeenCalledOnce();
  });
});
