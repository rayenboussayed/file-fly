import { describe, expect, it } from 'vitest';

import {
  formatBytes,
  formatCount,
  formatHourBucket,
  formatMs,
  formatPercent,
} from './format.js';

describe('formatBytes', () => {
  it('formats small and large units with binary steps', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1023)).toBe('1023 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(10 * 1024)).toBe('10 KB');
    expect(formatBytes(5 * 1024 ** 2)).toBe('5.0 MB');
    expect(formatBytes(3 * 1024 ** 3)).toBe('3.0 GB');
    expect(formatBytes(2 * 1024 ** 4)).toBe('2.0 TB');
  });

  it('handles invalid input', () => {
    expect(formatBytes(Number.NaN)).toBe('0 B');
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe('0 B');
    expect(formatBytes(-5)).toBe('0 B');
  });
});

describe('formatCount', () => {
  it('groups thousands', () => {
    expect(formatCount(0)).toBe('0');
    expect(formatCount(1234)).toBe('1,234');
    expect(formatCount(1_234_567)).toBe('1,234,567');
    expect(formatCount(12.9)).toBe('13');
  });
});

describe('formatPercent', () => {
  it('formats ratios as percentages', () => {
    expect(formatPercent(0)).toBe('0.0%');
    expect(formatPercent(0.5)).toBe('50.0%');
    expect(formatPercent(1)).toBe('100.0%');
    expect(formatPercent(0.1234, 2)).toBe('12.34%');
  });

  it('clamps and handles invalid input', () => {
    expect(formatPercent(1.5)).toBe('100.0%');
    expect(formatPercent(-0.5)).toBe('0.0%');
    expect(formatPercent(Number.NaN)).toBe('0%');
  });
});

describe('formatMs', () => {
  it('formats milliseconds and seconds', () => {
    expect(formatMs(50)).toBe('50.0 ms');
    expect(formatMs(999.9)).toBe('999.9 ms');
    expect(formatMs(1234.56)).toBe('1.23 s');
    expect(formatMs(Number.NaN)).toBe('0 ms');
    expect(formatMs(-1)).toBe('0 ms');
  });
});

describe('formatHourBucket', () => {
  it('extracts the day and hour', () => {
    expect(formatHourBucket('2026-11-17T14')).toBe('11-17 14:00');
    expect(formatHourBucket('')).toBe('00:00');
    expect(formatHourBucket('garbage')).toBe('00:00');
  });
});
