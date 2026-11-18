import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';

import { createWorkerLogger } from './worker-logger.js';

describe('createWorkerLogger', () => {
  it('writes one JSON line per entry to the given stream', async () => {
    const chunks: Buffer[] = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    });
    const logger = createWorkerLogger(stream);

    logger.error({ err: new Error('boom') }, 'worker failed');
    await new Promise((resolve) => setImmediate(resolve));

    const lines = Buffer.concat(chunks).toString('utf8').trim().split('\n');
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0] as string) as Record<string, unknown>;
    expect(entry['msg']).toBe('worker failed');
    expect(entry['level']).toBe(50);
    expect(entry['err']).toMatchObject({ message: 'boom' });
  });
});
