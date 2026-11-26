import { Readable, Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';

import { createOutMeter } from '@/metrics/out-meter.js';

import { pipeToReply } from './pipe.js';

/**
 * Collects everything written to a Writable.
 * @returns Sink with the collected chunks and the raw writable stream.
 */
function collector() {
  const chunks: Buffer[] = [];
  const raw = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      chunks.push(chunk);
      callback();
    },
  });
  return { chunks, raw };
}

describe('pipeToReply', () => {
  it('pipes the source into the raw response', async () => {
    const { chunks, raw } = collector();
    const response = { raw } as never;

    await pipeToReply(
      Readable.from(['hello', ' ', 'world']),
      response,
    );

    expect(Buffer.concat(chunks).toString()).toBe('hello world');
  });

  it('destroys the raw response when the source errors', async () => {
    const source = new Readable({
      read() {
        this.destroy(new Error('boom'));
      },
    });
    const { raw } = collector();
    const response = { raw } as never;

    await pipeToReply(source, response);

    expect(raw.destroyed).toBe(true);
  });

  it('counts zero bytes when the streamed file is empty', async () => {
    const metered: { bytes?: number } = {};
    const cls = {
      bytesOut: () => ({
        set: (value: number) => { metered.bytes = value; },
      }),
    } as never;
    const { raw } = collector();
    const response = { raw } as never;

    await pipeToReply(Readable.from([]), response, createOutMeter(cls));

    expect(metered.bytes).toBe(0);
  });

  it('counts streamed bytes when an out meter is passed', async () => {
    const metered: { bytes?: number } = {};
    const cls = {
      bytesOut: () => ({
        set: (value: number) => { metered.bytes = value; },
      }),
    } as never;
    const { chunks, raw } = collector();
    const response = { raw } as never;

    await pipeToReply(
      Readable.from([Buffer.from('abc'), Buffer.from('def')]),
      response,
      createOutMeter(cls),
    );

    expect(Buffer.concat(chunks).toString()).toBe('abcdef');
    expect(metered.bytes).toBe(6);
  });

  it('drains the meter when the raw response fails mid-stream', async () => {
    const cls = {
      bytesOut: () => ({ set: () => {} }),
    } as never;
    const source = Readable.from([Buffer.from('ab'), Buffer.from('cd')]);
    const raw = new Writable({
      write(_chunk: Buffer, _encoding, callback) {
        callback(new Error('boom'));
      },
    });
    const response = { raw } as never;

    await pipeToReply(source, response, createOutMeter(cls));

    expect(source.readableEnded).toBe(true);
    expect(raw.destroyed).toBe(true);
  });

  it('drains the source when the raw response fails mid-stream', async () => {
    const source = Readable.from([Buffer.from('ab'), Buffer.from('cd'), Buffer.from('ef')]);
    const raw = new Writable({
      write(_chunk: Buffer, _encoding, callback) {
        // Fails the stream on the first write, before the source is consumed.
        callback(new Error('boom'));
      },
    });
    const response = { raw } as never;

    await pipeToReply(source, response);

    // The source must be consumed to EOF so the sibling branch of the tee
    // (fed by this source) still receives the cached payload.
    expect(source.readableEnded).toBe(true);
    expect(raw.destroyed).toBe(true);
  });
});
