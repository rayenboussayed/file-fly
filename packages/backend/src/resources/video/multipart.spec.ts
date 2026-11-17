import { describe, expect, it } from 'vitest';

import { screenshotBoundary, writePartHeader, writeTerminator } from './multipart.js';

describe('multipart helpers', () => {
  it('produces a deterministic boundary', () => {
    const a = screenshotBoundary([0.5, 1.25]);
    const b = screenshotBoundary([0.5, 1.25]);
    expect(a).toBe(b);
    expect(a).toMatch(/^file-fly-screenshot-[0-9a-f]{32}$/);
  });

  it('writes a part header and terminator', () => {
    const header = writePartHeader(0, 0.5, 4, 'b');
    expect(header.toString()).toContain('X-Frame-Time: 0.5');
    expect(header.toString()).toContain('Content-Length: 4');
    const term = writeTerminator('b');
    expect(term.toString()).toBe('--b--\r\n');
  });
});