import { BadRequestException, UnsupportedMediaTypeException } from '@nestjs/common';
import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';

import { CsvService } from './csv.service.js';

const makeService = (body?: Buffer, contentType = 'text/csv') => {
  const stream = Readable.from([body ?? Buffer.from('a,b\n1,2\n3,4\n')]);
  const cls = {
    request: () => ({ headers: { 'content-type': contentType }, method: 'POST', raw: stream }),
    sourceDirection: () => ({ set: () => undefined }),
    sourceStream: () => ({ get: () => stream, set: () => undefined }),
  };
  return new CsvService(cls as never);
};

const drain = async (stream: Readable) => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk as Buffer));
  return Buffer.concat(chunks).toString('utf8');
};

describe('CsvService.buildCsv', () => {
  it('serializes object rows with a header by default behavior of csv-stringify', async () => {
    const service = makeService();
    const out = await drain(
      service.buildCsv({ records: [{ a: 1, b: 'x' }] }),
    );
    expect(out).toBe('1,x\n');
  });

  it('escapes formula cells by default', async () => {
    const service = makeService();
    const out = await drain(
      service.buildCsv({ records: [['=SUM(1,1)'], ['plain']] }),
    );
    expect(out).toBe('"\'=SUM(1,1)"\nplain\n');
  });

  it('respects explicit escape_formulas: false', async () => {
    const service = makeService();
    const out = await drain(
      service.buildCsv({ options: { escape_formulas: false }, records: [['=1']] }),
    );
    expect(out).toBe('=1\n');
  });

  it('respects a custom delimiter and header setting', async () => {
    const service = makeService();
    const out = await drain(
      service.buildCsv({
        options: { delimiter: ';', header: true },
        records: [{ a: 1, b: 2 }],
      }),
    );
    expect(out).toBe('a;b\n1;2\n');
  });

  it('serializes array rows positionally', async () => {
    const service = makeService();
    const out = await drain(
      service.buildCsv({ records: [[1, 'two'], [3, 'four']] }),
    );
    expect(out).toBe('1,two\n3,four\n');
  });
});

describe('CsvService.extract', () => {
  it('parses rows as arrays by default', async () => {
    const service = makeService();
    const { records } = await service.extract({});
    expect(records).toEqual([['a', 'b'], ['1', '2'], ['3', '4']]);
  });

  it('casts values when cast=true', async () => {
    const service = makeService();
    const { records } = await service.extract({ cast: true });
    expect(records[1]).toEqual([1, 2]);
  });

  it('maps headers to keys when columns=true', async () => {
    const service = makeService();
    const { records } = await service.extract({ columns: true });
    expect(records).toEqual([{ a: '1', b: '2' }, { a: '3', b: '4' }]);
  });

  it('accepts an explicit column list', async () => {
    const service = makeService();
    const { records } = await service.extract({ columns: ['first', 'second'] });
    expect(records[0]).toEqual({ first: 'a', second: 'b' });
  });

  it('strips a UTF-8 BOM by default', async () => {
    const service = makeService(Buffer.from([0xef, 0xbb, 0xbf, 0x61, 0x2c, 0x62, 0x0a]));
    const { records } = await service.extract({});
    expect(records).toEqual([['a', 'b']]);
  });

  it('skips error records when skip_records_with_error is set', async () => {
    const service = makeService(Buffer.from('a,b\n"unterminated\n'));
    const { records } = await service.extract({ relax_quotes: true, skip_records_with_error: true });
    expect(records).toHaveLength(1);
  });

  it('maps a csv-parse failure to BadRequestException', async () => {
    const service = makeService(Buffer.from('a,b\n"unterminated\nc,d\n'));
    await expect(service.extract({})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('answers 413 when a file exceeds the record cap', async () => {
    const rows = Array.from({ length: 1_000_001 }, () => 'x,y').join('\n');
    const service = makeService(Buffer.from(rows));
    await expect(service.extract({})).rejects.toMatchObject({
      status: 413,
    });
  }, 30_000);

  it('metadata answers 413 past the record cap', async () => {
    const rows = Array.from({ length: 1_000_001 }, () => 'x,y').join('\n');
    const service = makeService(Buffer.from(rows));
    await expect(service.metadata({ maxRows: 10 })).rejects.toMatchObject({
      status: 413,
    });
  }, 30_000);

  it('opens the source itself when the virus scanner is disabled', async () => {
    const raw = Readable.from([Buffer.from('a,b\n1,2\n')]);
    let stored: Readable | undefined;
    const cls = {
      request: () => ({ headers: { 'content-type': 'text/csv' }, method: 'POST', raw }),
      sourceDirection: () => ({ set: () => undefined }),
      sourceStream: () => ({
        get: () => stored,
        set: (stream: Readable) => {
          stored = stream;
        },
      }),
    };
    const service = new CsvService(cls as never);
    const { records } = await service.extract({});
    expect(records).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('maps a missing source stream to a client error, not a 500', async () => {
    const cls = {
      request: () => ({ headers: { 'content-type': 'text/csv' }, method: 'POST' }),
      sourceDirection: () => ({ set: () => undefined }),
      sourceStream: () => ({ get: () => undefined, set: () => undefined }),
    };
    const service = new CsvService(cls as never);
    await expect(service.extract({})).rejects.toMatchObject({
      response: { code: 'CSV_NO_SOURCE' },
    });
  });

  it('rejects non-CSV content types with 415', async () => {
    const service = makeService(Buffer.from('<xml/>'), 'application/xml');
    await expect(service.extract({})).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });

  it('honours from/to record windows', async () => {
    const service = makeService();
    const { records } = await service.extract({ from: 2, to: 2 });
    expect(records).toEqual([['1', '2']]);
  });
});

describe('CsvService.metadata', () => {
  it('reports rows, columns and a per-column type census', async () => {
    const service = makeService(
      Buffer.from('name,count,flag\nx,1,true\ny,2,false\nz,,\n'),
    );
    const meta = await service.metadata({ maxRows: 100 });
    expect(meta.rows).toBe(4);
    expect(meta.columns).toBe(3);
    expect(meta.delimiter).toBe('auto');
    // Header row counts as a data row: 'count'/'flag' headers are strings.
    expect(meta.perColumn[1]).toEqual({
      index: 1,
      types: { boolean: 0, date: 0, empty: 1, number: 2, string: 1 },
    });
    expect(meta.perColumn[2]).toEqual({
      index: 2,
      types: { boolean: 2, date: 0, empty: 1, number: 0, string: 1 },
    });
  });

  it('caps the type census at maxRows but keeps counting rows', async () => {
    const service = makeService(
      Buffer.from('a,b\n1,2\n3,4\n5,6\n'),
    );
    const meta = await service.metadata({ maxRows: 2 });
    expect(meta.rows).toBe(4);
    expect(meta.truncatedTypes).toBe(true);
  });

  it('detects the delimiter from the body when requested explicitly', async () => {
    const service = makeService(Buffer.from('a;b\n1;2\n'));
    const meta = await service.metadata({ maxRows: 100 });
    expect(meta.rows).toBe(2);
    expect(meta.columns).toBe(2);
  });
});

describe('CsvService typed cells census', () => {
  it('counts cast date cells as dates when cast_date is on', async () => {
    const service = makeService(Buffer.from('name,when\na,"2026-01-02T00:00:00Z"\nb,"2026-01-03T00:00:00Z"\n'));
    const meta = await service.metadata({ cast: true, cast_date: true, delimiter: ',', maxRows: 100 });
    expect(meta.perColumn[1]).toEqual({
      index: 1,
      types: { boolean: 0, date: 2, empty: 0, number: 0, string: 1 },
    });
  });
});
