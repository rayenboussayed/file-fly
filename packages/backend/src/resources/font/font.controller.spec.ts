import { Writable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

import { FontController } from './font.controller.js';

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

describe('FontController', () => {
  it('delegates metadata, extract and shape to the service', async () => {
    const fontService = {
      extract: vi.fn(async () => ({ familyName: 'Fixture', glyphs: [], numGlyphs: 0 })),
      metadata: vi.fn(async () => ({ familyName: 'Fixture', numGlyphs: 0 })),
      shape: vi.fn(async () => ({ advanceWidth: 100, glyphs: [], script: 'latn' })),
      subset: vi.fn(async () => Buffer.from('subset-bytes')),
    };
    const controller = new FontController(fontService as never, {} as never);

    await expect(controller.metadata({})).resolves.toMatchObject({ familyName: 'Fixture' });
    expect(fontService.metadata).toHaveBeenCalledWith({});

    await expect(controller.extract({ font: 'FixturePS' })).resolves.toMatchObject({ numGlyphs: 0 });
    expect(fontService.extract).toHaveBeenCalledWith({ font: 'FixturePS' });

    await expect(controller.shape({ text: 'Hi' })).resolves.toMatchObject({ advanceWidth: 100 });
    expect(fontService.shape).toHaveBeenCalledWith({ text: 'Hi' });
  });

  it('streams the subset output as font/ttf with the pdf-embed hint header', async () => {
    const fontService = {
      extract: vi.fn(),
      metadata: vi.fn(),
      shape: vi.fn(),
      subset: vi.fn(async () => Buffer.from('subset-bytes')),
    };
    const controller = new FontController(fontService as never, {} as never);
    const response = { raw: rawSink() };

    await controller.subset(response as never, { text: 'Hi' });

    expect(fontService.subset).toHaveBeenCalledWith({ text: 'Hi' });
    expect(response.raw.setHeader).toHaveBeenCalledWith('content-type', 'font/ttf');
    expect(response.raw.setHeader).toHaveBeenCalledWith('x-font-subset', 'pdf-embed');
  });
});
