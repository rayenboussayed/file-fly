import { describe, expect, it } from 'vitest';

import type { AudioProcessorType } from '../schema.js';

import { buildFilters } from './filters.js';

const base = {
  format: 'mp3',
} as AudioProcessorType;

/**
Runtime shape of a node-av FilterAPI: description exists but is private in the types.
 */
type DescribedFilter = { description: string };

const descriptions = (filters: ReturnType<typeof buildFilters>): string[] =>
  filters.map((filter) => (filter as unknown as DescribedFilter).description);

describe('buildFilters', () => {
  it('returns an empty pipeline for pristine settings', () => {
    expect(buildFilters(base)).toHaveLength(0);
  });

  it('downmixes to mono when channels is 1', () => {
    expect(descriptions(buildFilters({ ...base, channels: '1' } as never))).toContain('pan=mono|c0=.5*c0+.5*c1');
  });

  it('resamples when a sample rate is set', () => {
    expect(descriptions(buildFilters({ ...base, sampleRate: '48000' } as never))).toContain('aresample=48000');
  });

  it('normalizes loudness when normalize is on', () => {
    expect(descriptions(buildFilters({ ...base, normalize: true } as never))).toContain('loudnorm=I=-16:TP=-1.5:LRA=11');
  });

  it('denoises, compresses, gaines and repitches', () => {
    expect(descriptions(buildFilters({ ...base, denoise: true } as never))).toContain('anlmdn');
    expect(descriptions(buildFilters({ ...base, compress: true } as never))).toContain('acompressor');
    expect(descriptions(buildFilters({ ...base, gain: 6 } as never))).toContain('volume=6dB');
    expect(descriptions(buildFilters({ ...base, speed: 2 } as never))).toContain('atempo=2');
  });

  it('fades in and out', () => {
    expect(descriptions(buildFilters({ ...base, fadeIn: 1.5 } as never))).toContain('afade=t=in:st=0:d=1.5');
    expect(descriptions(buildFilters({ ...base, fadeOut: 2 } as never))).toContain('afade=t=out:st=0:d=2');
  });

  it('adds atrim with a start only', () => {
    expect(descriptions(buildFilters({ ...base, trimStart: 1 } as never))).toContain('atrim=start=1');
  });

  it('adds atrim with a start and end', () => {
    const filters = descriptions(buildFilters({ ...base, trimEnd: 3, trimStart: 1 } as never));
    expect(filters).toContain('atrim=start=1:end=3');
    expect(filters).toContain('asetpts=PTS-STARTPTS');
  });
});

describe('buildFilters trimEnd-only', () => {
  it('adds atrim with only an end (start defaults to 0)', () => {
    const filters = buildFilters({ ...base, trimEnd: 2.5 } as never);
    expect(descriptions(filters)).toContain('atrim=start=0:end=2.5');
  });
});
