import { describe, expect, it } from 'vitest';

import { toDemuxerFormat } from './input-format.js';

describe('toDemuxerFormat', () => {
  it('maps extensions and mime types', () => {
    expect(toDemuxerFormat({ ext: 'mkv', mime: 'video/x-matroska' } as never)).toBe('matroska');
    expect(toDemuxerFormat({ ext: 'mp3', mime: 'audio/mpeg' } as never)).toBe('mp3');
    expect(toDemuxerFormat({ ext: 'mp4', mime: 'video/mp4' } as never)).toBe('mp4');
    expect(toDemuxerFormat({ ext: 'zzz', mime: 'video/mp4' } as never)).toBe('mp4');
    expect(toDemuxerFormat({ ext: 'wav', mime: 'audio/wav' } as never)).toBe('wav');
    expect(toDemuxerFormat({ ext: '4xm', mime: 'application/octet-stream' } as never)).toBe('4xm');
  });

  it('returns undefined for unsupported signatures', () => {
    expect(toDemuxerFormat(undefined)).toBeUndefined();
    expect(toDemuxerFormat({ ext: 'mid', mime: 'audio/midi' } as never)).toBeUndefined();
  });
});