import { describe, expect, it } from 'vitest';

import { textOf } from './ooxml-xml.js';

describe('textOf edge nodes', () => {
  it('concatenates plain strings and #text object forms', () => {
    const node = {
      p: [
        { r: { t: 'Hello ' } },
        { r: { t: { '#text': 'world' } } },
        { r: { t: 42 } },
        { t: '!' },
      ],
    };
    expect(textOf(node)).toBe('Hello world!');
  });
});
