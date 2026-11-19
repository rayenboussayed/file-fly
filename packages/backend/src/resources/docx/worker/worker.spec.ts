import { Writable } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  error: vi.fn(),
  workerData: { operation: 'build', payload: {} as Record<string, unknown> },
}));
vi.mock('node:worker_threads', () => ({
  get workerData() {
    return hoisted.workerData;
  },
}));
vi.mock('../../../logging/worker-logger.js', () => ({
  createWorkerLogger: () => ({ error: hoisted.error }),
}));

/**
 * Captures the worker's stdout byte channel and resolves as soon as the first
 * write lands, so tests never depend on wall-clock timing.
 * @returns The captured writes and a promise resolving on the first write.
 */
const captureStdout = () => {
  const writes: Buffer[] = [];
  let signalWrite!: () => void;
  const written = new Promise<void>((resolve) => {
    signalWrite = resolve;
  });
  const stdout = new Writable({
    write(chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
      writes.push(Buffer.from(chunk as Buffer));
      signalWrite();
      callback();
    },
    writev(chunks: Array<{ chunk: unknown }>, callback: (error?: Error | null) => void) {
      for (const { chunk } of chunks) writes.push(Buffer.from(chunk as Buffer));
      signalWrite();
      callback();
    },
  });
  stdout.on('error', () => undefined);
  Object.defineProperty(process, 'stdout', { configurable: true, value: stdout, writable: true });
  return { writes, written };
};

const unzip = async (writes: Buffer[]) => {
  const { unzipSync } = await import('fflate');
  return unzipSync(Buffer.concat(writes));
};

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
    hoisted.error.mockReset();
  });

  afterEach(() => {
    Object.defineProperty(process, 'stdout', { configurable: true, value: originalStdout, writable: true });
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.doUnmock('../../../services/ooxml-reader.js');
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

  it('builds notes, comments, numbering alignment and every header/footer variant', async () => {
    const para = { runs: [{ text: 'x' }], type: 'paragraph' as const };
    hoisted.workerData = {
      operation: 'build',
      payload: {
        comments: [{ author: 'A', children: [para], id: 1, initials: 'A' }],
        endnotes: [{ children: [para], id: 2 }],
        footnotes: [{ children: [para], id: 1 }],
        numbering: [{ levels: [{ alignment: 'center', format: 'bullet', level: 0 }], reference: 'l' }],
        sections: [
          {
            children: [{ runs: [{ text: 'Body' }], type: 'paragraph' }],
            footers: { first: [para] },
            headers: { default: 'blank', even: [para], first: [para] },
          },
          { children: [{ runs: [{ text: 'Second' }], type: 'paragraph' }], footers: { first: [para] } },
        ],
      },
    };
    vi.resetModules();
    const { writes, written } = captureStdout();
    await import('./index.js');
    await written;
    const parts = await unzip(writes);
    const document = Buffer.from(parts['word/document.xml'] ?? new Uint8Array()).toString('utf8');
    expect(document).toContain('Body');
    expect(document).toContain('Second');
    expect(document).toContain('<w:titlePg');
    expect(Object.keys(parts)).toEqual(
      expect.arrayContaining(['word/footnotes.xml', 'word/endnotes.xml', 'word/comments.xml']),
    );
    expect(Object.keys(parts).some((name) => /^word\/header\d+\.xml$/.test(name))).toBe(true);
    expect(Object.keys(parts).some((name) => /^word\/footer\d+\.xml$/.test(name))).toBe(true);
    expect(hoisted.error).not.toHaveBeenCalled();
  }, 30000);

  it('builds a minimal payload without metadata, numbering or header/footer specs', async () => {
    hoisted.workerData = {
      operation: 'build',
      payload: { sections: [{ children: [{ runs: [{ text: 'Plain' }], type: 'paragraph' }] }] },
    };
    vi.resetModules();
    const { writes, written } = captureStdout();
    await import('./index.js');
    await written;
    const parts = await unzip(writes);
    const document = Buffer.from(parts['word/document.xml'] ?? new Uint8Array()).toString('utf8');
    expect(document).toContain('Plain');
    expect(document).toContain('<w:titlePg w:val="false"/>');
    expect(hoisted.error).not.toHaveBeenCalled();
  }, 30000);

  it('logs an error and emits no document for an unsupported operation', async () => {
    let signal!: (args: unknown[]) => void;
    const errored = new Promise<unknown[]>((resolve) => {
      signal = resolve;
    });
    hoisted.error.mockImplementation((...args: unknown[]) => signal(args));
    hoisted.workerData = { operation: 'export', payload: { sections: [] } };
    vi.resetModules();
    const { writes } = captureStdout();
    await import('./index.js');
    const [context, message] = await errored;
    expect(context).toMatchObject({ operation: 'export' });
    expect(message).toBe('unsupported worker operation');
    expect(writes).toHaveLength(0);
  });

  it('logs a build failure and emits nothing when the output lacks document.xml', async () => {
    vi.resetModules();
    vi.doMock('../../../services/ooxml-reader.js', () => ({
      OoxmlReader: { readParts: () => new Map([['[Content_Types].xml', Buffer.from('x')]]) },
    }));
    let signal!: (args: unknown[]) => void;
    const errored = new Promise<unknown[]>((resolve) => {
      signal = resolve;
    });
    hoisted.error.mockImplementation((...args: unknown[]) => signal(args));
    hoisted.workerData = { operation: 'build', payload: { sections: [{ children: [] }] } };
    const { writes } = captureStdout();
    await import('./index.js');
    const [context, message] = await errored;
    expect((context as { err: Error }).err.message).toBe('missing word/document.xml in output');
    expect(message).toBe('docx build failed');
    expect(writes).toHaveLength(0);
  });
});
