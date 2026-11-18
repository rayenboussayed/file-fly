import { Readable, Writable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

import { DocxController } from './docx.controller.js';

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

describe('DocxController', () => {
  it('streams the build output as a docx with a content disposition', async () => {
    const docxService = {
      build: vi.fn(async () => Readable.from([Buffer.from('docx-bytes')])),
      extract: vi.fn(async () => ({ format: 'docx', text: 'hi' })),
      metadata: vi.fn(async () => ({ format: 'docx', title: 't' })),
    };
    const controller = new DocxController(docxService as never, {} as never);
    const response = { raw: rawSink() };

    await controller.build(response as never, { sections: [{ children: [] }] });

    expect(docxService.build).toHaveBeenCalledOnce();
    expect(response.raw.setHeader).toHaveBeenCalledWith(
      'content-type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    expect(response.raw.setHeader).toHaveBeenCalledWith(
      'content-disposition',
      'attachment; filename="export.docx"',
    );
  });

  it('delegates metadata and extract to the service', async () => {
    const docxService = {
      build: vi.fn(),
      extract: vi.fn(async () => ({ format: 'docx' })),
      metadata: vi.fn(async () => ({ format: 'docx' })),
    };
    const controller = new DocxController(docxService as never, {} as never);

    await expect(controller.metadata({} as never)).resolves.toEqual({ format: 'docx' });
    expect(docxService.metadata).toHaveBeenCalledOnce();

    await expect(controller.extract({} as never)).resolves.toEqual({ format: 'docx' });
    expect(docxService.extract).toHaveBeenCalledOnce();
  });
});
