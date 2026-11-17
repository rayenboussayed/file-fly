import { FilterAPI } from 'node-av/api';

import type { VideoProcessorType } from '../schema.js';

// eslint-disable-next-line jsdoc/require-returns
/**
 *
// eslint-disable-next-line jsdoc/require-param-description
// eslint-disable-next-line jsdoc/require-param-description
 * @param payload Description.
 */
export function buildAudioFilters(payload: VideoProcessorType) {
  const filters: FilterAPI[] = [];
  if (payload.audioChannels === '1') filters.push(FilterAPI.create('pan=mono|c0=.5*c0+.5*c1'));
  if (payload.audioSampleRate) filters.push(FilterAPI.create(`aresample=${payload.audioSampleRate}`));
  if (payload.audioNormalize) filters.push(FilterAPI.create('loudnorm=I=-16:TP=-1.5:LRA=11'));
  return filters;
}

// eslint-disable-next-line jsdoc/require-returns
/**
 *
// eslint-disable-next-line jsdoc/require-param-description
// eslint-disable-next-line jsdoc/require-param-description
 * @param payload Description.
 */
export function buildVideoFilters(payload: VideoProcessorType) {
  const filters: FilterAPI[] = [];

  if (payload.trimStart !== undefined || payload.trimEnd !== undefined) {
    const start = payload.trimStart ?? 0;
    filters.push(
      FilterAPI.create(payload.trimEnd === undefined ? `trim=start=${start}` : `trim=start=${start}:end=${payload.trimEnd}`),
      FilterAPI.create('setpts=PTS-STARTPTS'),
    );
  }

  if (payload.deinterlace) filters.push(FilterAPI.create('yadif'));
  if (payload.width !== undefined || payload.height !== undefined) {
    filters.push(FilterAPI.create(`scale=${payload.width ?? -1}:${payload.height ?? -1}`));
  }
  if (payload.fps !== undefined) filters.push(FilterAPI.create(`fps=${payload.fps}`));
  if (payload.rotate === '90') filters.push(FilterAPI.create('transpose=1'));
  if (payload.rotate === '180') filters.push(FilterAPI.create('transpose=1,transpose=1'));
  if (payload.rotate === '270') filters.push(FilterAPI.create('transpose=2'));
  if (payload.flip) filters.push(FilterAPI.create('hflip'));
  if (payload.flop) filters.push(FilterAPI.create('vflip'));
  if (payload.normalize) filters.push(FilterAPI.create('eq=contrast=1.1:brightness=0.04:saturation=1.05'));
  if (payload.denoise) filters.push(FilterAPI.create('hqdn3d'));
  if (payload.sharpen) filters.push(FilterAPI.create('unsharp=5:5:1.0:5:5:0.0'));
  if (payload.grayscale) filters.push(FilterAPI.create('hue=s=0'));
  filters.push(FilterAPI.create('format=yuv420p'));

  return filters;
}
