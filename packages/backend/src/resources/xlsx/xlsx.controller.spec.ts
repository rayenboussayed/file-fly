import { Writable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

import { XlsxController } from './xlsx.controller.js';

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

describe('XlsxController', () => {
  it('streams the build output as an xlsx with a content disposition', async () => {
    const xlsxService = {
      build: vi.fn(async () => Buffer.from('PK\x03\x04xlsx-bytes')),
      extract: vi.fn(async () => ({ records: [{ a: 1 }], sheet: 'Sheet1' })),
      metadata: vi.fn(async () => ({ rows: 1 })),
    };
    const controller = new XlsxController(xlsxService as never, {} as never);
    const response = { raw: rawSink() };

    await controller.build(response as never, { sheets: [{ rows: [['a', 1]] }] });

    expect(xlsxService.build).toHaveBeenCalled();
    expect(response.raw.setHeader).toHaveBeenCalledWith(
      'content-type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    expect(response.raw.setHeader).toHaveBeenCalledWith(
      'content-disposition',
      'attachment; filename="export.xlsx"',
    );
  });

  it('delegates extract and metadata to the service', async () => {
    const xlsxService = {
      build: vi.fn(),
      extract: vi.fn(async () => ({ records: [{ x: 1 }], sheet: 'People' })),
      metadata: vi.fn(async () => ({ rows: 3 })),
    };
    const controller = new XlsxController(xlsxService as never, {} as never);

    await expect(
      controller.extract({ maxCells: 1000, raw: true, sheet: 'People' }),
    ).resolves.toEqual({ records: [{ x: 1 }], sheet: 'People' });
    expect(xlsxService.extract).toHaveBeenCalledWith({ maxCells: 1000, raw: true, sheet: 'People' });

    await expect(controller.metadata({ maxCells: 100 })).resolves.toEqual({ rows: 3 });
    expect(xlsxService.metadata).toHaveBeenCalledWith({ maxCells: 100 });
  });
});
