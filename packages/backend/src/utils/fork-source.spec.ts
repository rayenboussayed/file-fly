import { describe, expect, it } from 'vitest';

import { forkSource } from './fork-source.js';

describe('forkSource', () => {
  it('throws when no source stream is bound', () => {
    const cls = {
      sourceStream: () => ({ get: () => undefined, set: () => undefined }),
    };
    expect(() => forkSource(cls as never)).toThrow('forkSource requires an opened source stream');
  });
});
