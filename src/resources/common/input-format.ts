import type { FileTypeResult } from 'file-type';

import { demuxerFormats } from '@/constants/av-formats.js';

const DEMUXER_FORMATS = new Set<string>(demuxerFormats);

/**
 * Maps a detected file signature to an FFmpeg demuxer format name.
 *
 * file-type reports short extensions (e.g. `mkv`, `mts`), while FFmpeg's
 * demuxer names occasionally differ (e.g. `matroska`, `mpegts`). This table
 * bridges that gap so callers never have to pass `inputFormat` manually.
 */
const EXT_TO_DEMUXER: Readonly<Record<string, string>> = {
  '3g2': '3g2',
  '3gp': '3gp',
  aac: 'aac',
  ac3: 'ac3',
  aif: 'aiff',
  aifc: 'aiff',
  aiff: 'aiff',
  amr: 'amr',
  ape: 'ape',
  asf: 'asf',
  avi: 'avi',
  caf: 'caf',
  dff: 'dsf',
  dsf: 'dsf',
  dts: 'dts',
  eac3: 'eac3',
  flac: 'flac',
  flv: 'flv',
  m2t: 'mpegts',
  m2ts: 'mpegts',
  m4a: 'm4a',
  m4v: 'mp4',
  mkv: 'matroska',
  mov: 'mov',
  mp1: 'mp2',
  mp2: 'mp2',
  mp3: 'mp3',
  mp4: 'mp4',
  mpc: 'mpc',
  mpc8: 'mpc8',
  mpe: 'mpeg',
  mpeg: 'mpeg',
  mpg: 'mpeg',
  mts: 'mpegts',
  oga: 'ogg',
  ogg: 'ogg',
  ogv: 'ogg',
  opus: 'opus',
  qt: 'mov',
  rm: 'rm',
  rmvb: 'rm',
  spx: 'spx',
  ts: 'mpegts',
  voc: 'voc',
  wav: 'wav',
  webm: 'webm',
  wma: 'asf',
  wmv: 'asf',
  wv: 'wv',
};

const MIME_TO_DEMUXER: Readonly<Record<string, string>> = {
  'audio/aac': 'aac',
  'audio/ac3': 'ac3',
  'audio/amr': 'amr',
  'audio/ape': 'ape',
  'audio/flac': 'flac',
  'audio/m4a': 'm4a',
  'audio/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/ogg; codecs=opus': 'ogg',
  'audio/opus': 'opus',
  'audio/wav': 'wav',
  'audio/wavpack': 'wv',
  'audio/x-flac': 'flac',
  'audio/x-m4a': 'm4a',
  'audio/x-ms-asf': 'asf',
  'audio/x-wav': 'wav',
  'video/3gpp': '3gp',
  'video/3gpp2': '3g2',
  'video/matroska': 'matroska',
  'video/mp2t': 'mpegts',
  'video/mp4': 'mp4',
  'video/mpeg': 'mpeg',
  'video/ogg': 'ogg',
  'video/quicktime': 'mov',
  'video/vnd.avi': 'avi',
  'video/webm': 'webm',
  'video/x-flv': 'flv',
  'video/x-m4v': 'mp4',
  'video/x-ms-asf': 'asf',
};

/**
 * Resolve a detected file signature to an FFmpeg demuxer format name.
 * @param signature Description.
 * @returns Result.
 */
export function toDemuxerFormat(signature: FileTypeResult | undefined): string | undefined {
  if (!signature) return undefined;
  const ext = signature.ext?.toLowerCase();
  if (ext) {
    // eslint-disable-next-line security/detect-object-injection
    if (Object.prototype.hasOwnProperty.call(EXT_TO_DEMUXER, ext)) return EXT_TO_DEMUXER[ext];
    if (DEMUXER_FORMATS.has(ext)) return ext;
  }
  const mime = signature.mime?.toLowerCase();
  // eslint-disable-next-line security/detect-object-injection
  if (mime && Object.prototype.hasOwnProperty.call(MIME_TO_DEMUXER, mime)) return MIME_TO_DEMUXER[mime];
  return undefined;
}