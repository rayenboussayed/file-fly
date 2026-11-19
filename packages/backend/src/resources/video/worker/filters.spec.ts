import { describe, expect, it } from 'vitest';

import type { VideoProcessorType } from '../schema.js';

import { buildAudioFilters, buildVideoFilters } from './filters.js';

const base: VideoProcessorType = {
  audioNormalize: false,
  deinterlace: false,
  denoise: false,
  flip: false,
  flop: false,
  format: 'mp4',
  grayscale: false,
  normalize: false,
  sharpen: false,
} as VideoProcessorType;

/** Runtime shape of a node-av FilterAPI: description exists but is private in the types. */
type DescribedFilter = { description: string };

const descriptions = (filters: Array<object>): string[] =>
  filters.map((filter) => (filter as unknown as DescribedFilter).description);

describe('buildAudioFilters', () => {
  it('returns an empty pipeline for pristine settings', () => {
    expect(buildAudioFilters(base)).toHaveLength(0);
  });

  it('downmixes to mono when requested', () => {
    const filters = descriptions(buildAudioFilters({ ...base, audioChannels: '1' }));
    expect(filters).toContain('pan=mono|c0=.5*c0+.5*c1');
  });

  it('resamples when an audio rate is set', () => {
    const filters = descriptions(buildAudioFilters({ ...base, audioSampleRate: '48000' }));
    expect(filters).toContain('aresample=48000');
  });

  it('normalizes loudness when requested', () => {
    const filters = descriptions(buildAudioFilters({ ...base, audioNormalize: true }));
    expect(filters).toContain('loudnorm=I=-16:TP=-1.5:LRA=11');
  });
});

describe('buildVideoFilters', () => {
  it('always terminates in yuv420p', () => {
    expect(descriptions(buildVideoFilters(base))).toEqual(['format=yuv420p']);
  });

  it('adds trim and setpts for a trim range', () => {
    const filters = descriptions(buildVideoFilters({ ...base, trimEnd: 3, trimStart: 1 }));
    expect(filters).toContain('trim=start=1:end=3');
    expect(filters).toContain('setpts=PTS-STARTPTS');
  });

  it('adds an open-ended trim', () => {
    const filters = descriptions(buildVideoFilters({ ...base, trimStart: 2 }));
    expect(filters).toContain('trim=start=2');
  });

  it('scales when width or height is set', () => {
    expect(descriptions(buildVideoFilters({ ...base, width: 128 }))).toContain('scale=128:-1');
    expect(descriptions(buildVideoFilters({ ...base, height: 96 }))).toContain('scale=-1:96');
  });

  it('maps the rotate and flip flags', () => {
    expect(descriptions(buildVideoFilters({ ...base, rotate: '90' }))).toContain('transpose=1');
    expect(descriptions(buildVideoFilters({ ...base, rotate: '270' }))).toContain('transpose=2');
    expect(descriptions(buildVideoFilters({ ...base, flip: true }))).toContain('hflip');
    expect(descriptions(buildVideoFilters({ ...base, flop: true }))).toContain('vflip');
    expect(descriptions(buildVideoFilters({ ...base, grayscale: true }))).toContain('hue=s=0');
  });

  it('maps quality flags', () => {
    expect(descriptions(buildVideoFilters({ ...base, fps: 15 }))).toContain('fps=15');
    expect(descriptions(buildVideoFilters({ ...base, deinterlace: true }))).toContain('yadif');
    expect(descriptions(buildVideoFilters({ ...base, denoise: true }))).toContain('hqdn3d');
    expect(descriptions(buildVideoFilters({ ...base, sharpen: true }))).toContain('unsharp=5:5:1.0:5:5:0.0');
    expect(descriptions(buildVideoFilters({ ...base, normalize: true }))).toContain('eq=contrast=1.1:brightness=0.04:saturation=1.05');
  });
});
