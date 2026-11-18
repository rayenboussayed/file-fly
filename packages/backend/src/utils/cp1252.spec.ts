import { describe, expect, it } from 'vitest';

import { findUnencodableWinAnsi } from './cp1252.js';

describe('findUnencodableWinAnsi', () => {
  it('accepts plain ASCII and typical latin text', () => {
    expect(findUnencodableWinAnsi('Hello, World! 123 áéíóú ñ € … — \u2019')).toEqual([]);
  });

  it('accepts every WinAnsi high-range code point used in Windows documents', () => {
    for (const char of ['Š', 'š', 'Œ', 'œ', 'Ž', 'ž', 'Ÿ', '™', '†', '‡', '‰', '‹', '›', '•']) {
      expect(findUnencodableWinAnsi(char)).toEqual([]);
    }
  });

  it('flags characters outside WinAnsi', () => {
    expect(findUnencodableWinAnsi('Łódź').map(({ char }) => char)).toEqual(['Ł', 'ź']);
    expect(findUnencodableWinAnsi('a→b').map(({ char }) => char)).toEqual(['→']);
    expect(findUnencodableWinAnsi('日本語').length).toBeGreaterThan(0);
    expect(findUnencodableWinAnsi('🎉')).toHaveLength(1);
  });

  it('deduplicates and caps the report', () => {
    const report = findUnencodableWinAnsi('łłłę→…ńņ', 2);
    expect(report).toHaveLength(2);
  });
});
