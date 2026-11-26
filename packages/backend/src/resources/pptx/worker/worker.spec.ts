import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  workerData: { operation: 'build', payload: {} as Record<string, unknown> },
}));
vi.mock('node:worker_threads', () => ({ workerData: hoisted.workerData }));

const smallDeck = {
  layout: 'LAYOUT_16x9',
  metadata: { author: 'Fixture Author', title: 'Worker Fixture' },
  slides: [
    {
      elements: [
        {
          h: 1,
          runs: [{ bold: true, text: 'Worker Heading' }],
          type: 'text',
          w: 8,
          x: 1,
          y: 1,
        },
        {
          fill: { color: 'FF8800' },
          h: 2,
          shape: 'rect',
          type: 'shape',
          w: 2,
          x: 1,
          y: 3,
        },
        {
          h: 1,
          rows: [[{ text: 'a' }], [{ text: 'b' }]],
          type: 'table',
          w: 2,
          x: 1,
          y: 6,
        },
      ],
      notes: 'worker notes',
    },
  ],
};

describe('pptx worker', () => {
  const originalStdout = process.stdout;

  beforeEach(() => {
    vi.stubEnv('FILE_FLY_WORKER', '0');
  });

  afterEach(() => {
    Object.defineProperty(process, 'stdout', { value: originalStdout, writable: true });
    vi.unstubAllEnvs();
  });

  it('maps a failed build to a rejected promise (worker logs and exits non-zero)', async () => {
    vi.resetModules();
    vi.doMock('node:worker_threads', () => ({
      workerData: {
        operation: 'build',
        payload: {
          layout: 'LAYOUT_16x9',
          slides: [
            {
              elements: [
                { fill: undefined, h: 1, shape: 'not-a-shape', type: 'shape', w: 1, x: 0, y: 0 },
              ],
            },
          ],
        },
      },
    }));
    const writes: Buffer[] = [];
    const { Writable } = await import('node:stream');
    const stdout = new Writable({
      write(chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
        writes.push(Buffer.from(chunk as Buffer));
        callback();
      },
      writev(_chunks: { chunk: unknown; encoding: BufferEncoding }[], callback: (error?: Error | null) => void) {
        callback();
      },
    });
    stdout.on('error', () => {});
    Object.defineProperty(process, 'stdout', { value: stdout, writable: true });

    await import('./index.js');
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
    expect(writes).toHaveLength(0);
  }, 30_000);

  it('ignores unsupported operations without writing bytes', async () => {
    vi.resetModules();
    vi.doMock('node:worker_threads', () => ({
      workerData: { operation: 'not-a-thing', payload: {} },
    }));
    const writes: Buffer[] = [];
    const { Writable } = await import('node:stream');
    const stdout = new Writable({
      write(chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
        writes.push(Buffer.from(chunk as Buffer));
        callback();
      },
      writev(_chunks: { chunk: unknown; encoding: BufferEncoding }[], callback: (error?: Error | null) => void) {
        callback();
      },
    });
    stdout.on('error', () => {});
    Object.defineProperty(process, 'stdout', { value: stdout, writable: true });

    await import('./index.js');
    await new Promise((resolve) => {
      setTimeout(resolve, 200);
    });
    expect(writes).toHaveLength(0);
  }, 30_000);

  it('builds a valid pptx with text, shape, table and notes', async () => {
    vi.resetModules();
    vi.doMock('node:worker_threads', () => ({
      workerData: { operation: 'build', payload: smallDeck },
    }));
    const writes: Buffer[] = [];
    const { Writable } = await import('node:stream');
    const stdout = new Writable({
      write(chunk: unknown, _encoding: BufferEncoding, callback: (error?: Error | null) => void) {
        writes.push(Buffer.from(chunk as Buffer));
        callback();
      },
      writev(_chunks: { chunk: unknown; encoding: BufferEncoding }[], callback: (error?: Error | null) => void) {
        callback();
      },
    });
    stdout.on('error', () => {});
    Object.defineProperty(process, 'stdout', { value: stdout, writable: true });

    const { strFromU8, unzipSync } = await import('fflate');
    await import('./index.js');
    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });

    const buffer = Buffer.concat(writes);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 2).toString('latin1')).toBe('PK');
    const parts = unzipSync(buffer);
    const slide1 = Object.entries(parts).find(([name]) => /^ppt\/slides\/slide1\.xml$/.test(name))?.[1];
    expect(slide1).toBeTruthy();
    const xml = strFromU8(slide1 ?? new Uint8Array());
    expect(xml).toContain('Worker Heading');
    expect(xml).toContain('<a:tbl>');
    const notes = Object.entries(parts).find(([name]) => /notesSlide1\.xml$/.test(name))?.[1];
    expect(notes).toBeTruthy();
    expect(strFromU8(notes ?? new Uint8Array())).toContain('worker notes');
    const core = Object.entries(parts).find(([name]) => name === 'docProps/core.xml')?.[1];
    expect(core).toBeTruthy();
    expect(strFromU8(core ?? new Uint8Array())).toContain('Worker Fixture');
  }, 30_000);
});
