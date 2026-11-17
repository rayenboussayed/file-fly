import { FilterAPI } from 'node-av/api';

import type { AudioProcessorType } from '../schema.js';

/**
 *
 * @param payload Requested adjustments.
 * @returns Ordered filter graph.
 */
export function buildFilters(payload: AudioProcessorType): FilterAPI[] {
  const filters: FilterAPI[] = [];

  if (payload.trimStart !== undefined || payload.trimEnd !== undefined) {
    const start = payload.trimStart ?? 0;
    const end = payload.trimEnd;
    filters.push(FilterAPI.create(end === undefined ? `atrim=start=${start}` : `atrim=start=${start}:end=${end}`));
    filters.push(FilterAPI.create('asetpts=PTS-STARTPTS'));
  }

  if (payload.channels === '1') filters.push(FilterAPI.create('pan=mono|c0=.5*c0+.5*c1'));
  if (payload.sampleRate) filters.push(FilterAPI.create(`aresample=${payload.sampleRate}`));
  if (payload.gain !== undefined) filters.push(FilterAPI.create(`volume=${payload.gain}dB`));
  if (payload.speed !== undefined) filters.push(FilterAPI.create(`atempo=${payload.speed}`));
  if (payload.normalize) filters.push(FilterAPI.create('loudnorm=I=-16:TP=-1.5:LRA=11'));
  if (payload.denoise) filters.push(FilterAPI.create('anlmdn'));
  if (payload.compress) filters.push(FilterAPI.create('acompressor'));
  if (payload.fadeIn !== undefined) filters.push(FilterAPI.create(`afade=t=in:st=0:d=${payload.fadeIn}`));
  if (payload.fadeOut !== undefined) filters.push(FilterAPI.create(`afade=t=out:st=0:d=${payload.fadeOut}`));

  return filters;
}
