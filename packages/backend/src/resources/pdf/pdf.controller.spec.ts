import { Writable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

import { PdfController } from './pdf.controller.js';

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

describe('PdfController', () => {
  it('streams the build output as a pdf with a content disposition', async () => {
    const pdfService = {
      build: vi.fn(async () => Buffer.from('%PDF-1.7 fixture')),
      extract: vi.fn(async () => ({ format: 'pdf' })),
      metadata: vi.fn(async () => ({ format: 'pdf' })),
    };
    const controller = new PdfController(pdfService as never, {} as never);
    const response = { raw: rawSink() };

    await controller.build(response as never, { pages: [] } as never);

    expect(pdfService.build).toHaveBeenCalledOnce();
    expect(response.raw.setHeader).toHaveBeenCalledWith('content-type', 'application/pdf');
    expect(response.raw.setHeader).toHaveBeenCalledWith('content-disposition', 'attachment; filename="export.pdf"');
  });

  it('delegates extract and metadata to the service', async () => {
    const pdfService = {
      build: vi.fn(),
      extract: vi.fn(async () => ({ format: 'pdf' })),
      metadata: vi.fn(async () => ({ format: 'pdf' })),
    };
    const controller = new PdfController(pdfService as never, {} as never);


    await expect(controller.extract({} as never)).resolves.toEqual({ format: 'pdf' });
    expect(pdfService.extract).toHaveBeenCalledOnce();


    await expect(controller.metadata({} as never)).resolves.toEqual({ format: 'pdf' });
    expect(pdfService.metadata).toHaveBeenCalledOnce();
  });
});
