import { Readable, Writable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

import { CsvController } from './csv.controller.js';

/**
 * Creates a Writable raw sink with a `setHeader` mock for assertions.
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

describe('CsvController', () => {
  it('streams the build output with a csv content type', async () => {
    const csvService = {
      buildCsv: vi.fn(() => Readable.from([Buffer.from('a,b\n1,2\n')])),
      extract: vi.fn(async () => ({ records: [['a', 'b']] })),
      metadata: vi.fn(async () => ({ columns: 2, rows: 2 })),
    };
    const cls = {};
    const controller = new CsvController(csvService as never, cls as never);
    const response = { raw: rawSink() };

    await controller.build(response as never, { records: [{ a: 1, b: 2 }] });

    expect(csvService.buildCsv).toHaveBeenCalledWith({ records: [{ a: 1, b: 2 }] });
    expect(response.raw.setHeader).toHaveBeenCalledWith('content-type', 'text/csv; charset=utf-8');
  });

  it('delegates extract and metadata to the service', async () => {
    const csvService = {
      buildCsv: vi.fn(() => Readable.from([])),
      extract: vi.fn(async () => ({ records: [] })),
      metadata: vi.fn(async () => ({ rows: 0 })),
    };
    const controller = new CsvController(csvService as never, {} as never);

    await expect(controller.extract({ cast: true, columns: true })).resolves.toEqual({
      records: [],
    });
    expect(csvService.extract).toHaveBeenCalledWith({ cast: true, columns: true });

    await expect(controller.metadata({ maxRows: 100 })).resolves.toEqual({ rows: 0 });
    expect(csvService.metadata).toHaveBeenCalledWith({ maxRows: 100 });
  });
});
