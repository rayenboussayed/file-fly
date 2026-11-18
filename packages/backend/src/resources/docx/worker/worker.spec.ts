import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  workerData: { operation: 'build', payload: {} as Record<string, unknown> },
}));
vi.mock('node:worker_threads', () => ({ workerData: hoisted.workerData }));

const smallDoc = {
  metadata: { creator: 'Fixture Author', title: 'Worker Fixture' },
  numbering: [
    {
      levels: [{ format: 'bullet', level: 0, text: '•' }],
      reference: 'fixture-list',
    },
  ],
  sections: [
    {
      children: [
        { heading: 1, runs: [{ text: 'Fixture Heading' }], type: 'paragraph' },
        { runs: [{ text: 'Body line one' }], type: 'paragraph' },
        { numbering: { level: 0, reference: 'fixture-list' }, runs: [{ text: 'Listed item' }], type: 'paragraph' },
        {
          rows: [
            [{ children: [{ runs: [{ text: 'cell-1' }], type: 'paragraph' }] }],
          ],
          type: 'table',
        },
      ],
      footers: { default: [{ runs: [{ text: 'Fixture Footer' }], type: 'paragraph' }] },
      headers: {
        default: [{ runs: [{ text: 'Fixture Header' }], type: 'paragraph' }],
        first: [{ runs: [{ text: 'Fixture First Page' }], type: 'paragraph' }],
      },
    },
  ],
};

describe('docx worker', () => {
  const originalStdout = process.stdout;

  beforeEach(() => {
    vi.stubEnv('FILE_FLY_WORKER', '0');
  });

  afterEach(() => {
    Object.defineProperty(process, 'stdout', { value: originalStdout, writable: true });
    vi.unstubAllEnvs();
  });

  it('builds a valid docx with metadata, headers, list and table', async () => {
    hoisted.workerData = { operation: 'build', payload: smallDoc };
    vi.resetModules();
    const writes: Buffer[] = [];
// eslint-disable-next-line @typescript-eslint/no-require-imports
    const stdout = new (require('node:stream').Writable)({
      write(chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
        writes.push(Buffer.from(chunk as Buffer));
        callback();
      },
      writev(_chunks: { chunk: unknown; encoding: BufferEncoding }[], callback: (error?: Error | null) => void) {
        callback();
      },
    });
    stdout.on('error', () => undefined);
    Object.defineProperty(process, 'stdout', { value: stdout, writable: true });

    const { unzipSync } = await import('fflate');
    await import('./index.js');
    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });

    const buffer = Buffer.concat(writes);
    expect(buffer.length).toBeGreaterThan(0);
    const parts = unzipSync(buffer);
    expect(Object.keys(parts)).toEqual(
      expect.arrayContaining(['word/document.xml', 'docProps/core.xml']),
    );
    const docPart = parts['word/document.xml'];
    expect(docPart).toBeTruthy();
    const document = Buffer.from(docPart ?? new Uint8Array()).toString('utf8');
    expect(document).toContain('Fixture Heading');
    expect(document).toContain('Body line one');
    expect(document).toContain('Listed item');
    expect(document).toContain('cell-1');
    const corePart = parts['docProps/core.xml'];
    expect(corePart).toBeTruthy();
    const core = Buffer.from(corePart ?? new Uint8Array()).toString('utf8');
    expect(core).toContain('Worker Fixture');
    expect(core).toContain('Fixture Author');
    const headerPart = Object.entries(parts).find(([name]) => /^word\/header\d+\.xml$/.test(name))?.[1];
    expect(headerPart).toBeTruthy();
    expect(Buffer.from(headerPart ?? new Uint8Array()).toString('utf8')).toContain('Fixture Header');
    expect(document).toContain('<w:titlePg');
  }, 30000);

});
