import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

// Mock the SheetJS boundary: each test steers the failure mode via the gate.
const gate = vi.hoisted(() => ({
  pathological: false,
  readThrows: undefined as Error | string | undefined,
  toJsonThrows: false as boolean | string,
  writeThrows: false,
}));

vi.mock('xlsx', async () => {
  const actual = await vi.importActual<typeof import('xlsx')>('xlsx');
  const read = (buffer: Buffer, options: unknown) => {
    if (gate.readThrows !== undefined) throw gate.readThrows;
    // A workbook whose SheetNames list a sheet the Sheets map lacks.
    return gate.pathological ? { SheetNames: ['Ghost'], Sheets: {} } : actual.read(buffer, options as never);
  };
  const write = (...args: Parameters<typeof actual.write>) => {
    if (gate.writeThrows) throw new Error('encoder exploded');
    return actual.write(...args);
  };
  const utils = {
    ...actual.utils,
    sheet_to_json: (...args: Parameters<typeof actual.utils.sheet_to_json>) => {
      if (typeof gate.toJsonThrows === 'string') throw gate.toJsonThrows;
      if (gate.toJsonThrows) throw new Error('decoder exploded');
      return actual.utils.sheet_to_json(...args);
    },
  };
  // The service default-imports xlsx; override at BOTH binding levels.
  return {
    ...actual,
    default: { ...(actual as unknown as { default: object }).default, read, utils, write },
    read,
    utils,
    write,
  };
});

import { XlsxService } from './xlsx.service.js';

 
const fixture = () => fs.readFileSync(path.join('test', 'results', 'fixtures', 'basic.xlsx'));

const makeService = (body: Buffer, contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') => {
  const stream = Readable.from([body]);
  const cls = {
    request: () => ({ headers: { 'content-type': contentType }, method: 'POST', raw: stream }),
    sourceDirection: () => ({ set: () => {} }),
    sourceStream: () => ({ get: () => stream, set: () => {} }),
  };
  return new XlsxService(cls as never);
};

describe('XlsxService library-boundary failure mapping', () => {
  it('maps a non-client read failure to 400 XLSX_PARSE_ERROR', async () => {
    gate.readThrows = new Error('zip exploded');
    const service = makeService(fixture());
    await expect(service.extract({ maxCells: 1000, raw: true })).rejects.toMatchObject({
      response: { code: 'XLSX_PARSE_ERROR', message: 'unreadable workbook' },
    });
    gate.readThrows = undefined;
  });

  it('maps a non-Error decoder failure (string) to 400 with the Raw message', async () => {
    gate.toJsonThrows = 'plain string explosion';
    const service = makeService(fixture());
    await expect(service.extract({ maxCells: 1000, raw: true, sheet: 'People' })).rejects.toMatchObject({
      response: { code: 'XLSX_PARSE_ERROR', message: 'plain string explosion' },
    });
    gate.toJsonThrows = false;
  });

  it('maps a non-client read failure to 400 in metadata as well', async () => {
    gate.readThrows = new Error('zip exploded');
    const service = makeService(fixture());
    await expect(service.metadata({ maxCells: 1000 })).rejects.toMatchObject({
      response: { code: 'XLSX_PARSE_ERROR' },
    });
    gate.readThrows = undefined;
  });

  it('maps a sheet_to_json failure to 400 XLSX_PARSE_ERROR', async () => {
    gate.toJsonThrows = true;
    const service = makeService(fixture());
    await expect(service.extract({ maxCells: 1000, raw: true, sheet: 'People' })).rejects.toMatchObject({
      response: { code: 'XLSX_PARSE_ERROR', message: 'decoder exploded' },
    });
    gate.toJsonThrows = false;
  });

  it('maps a write failure to 400 XLSX_PARSE_ERROR', async () => {
    gate.writeThrows = true;
    const service = makeService(fixture());
    await expect(
      service.build({ sheets: [{ rows: [['x'], [1]] }] }),
    ).rejects.toMatchObject({ response: { code: 'XLSX_PARSE_ERROR', message: 'encoder exploded' } });
    gate.writeThrows = false;
  });

  it('rejects a pathological workbook whose Sheets map lacks a listed sheet', async () => {
    gate.pathological = true;
    const service = makeService(fixture());
    await expect(service.extract({ maxCells: 1000, raw: true })).rejects.toMatchObject({
      response: { code: 'XLSX_SHEET_NOT_FOUND', message: 'sheet Ghost missing' },
    });
    gate.pathological = false;
  });
});
