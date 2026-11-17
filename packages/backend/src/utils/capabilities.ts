/**
 *
 */
export const STREAMABLE_OUTPUT_FORMATS = [
  'webm',
  'matroska',
  'mpegts',
  'mp3',
  'ogg',
  'adts',
  'flac',
  'mp4',
] as const;

export type StreamableOutputFormat = (typeof STREAMABLE_OUTPUT_FORMATS)[number];

export const OUTPUT_CONTENT_TYPE: Record<StreamableOutputFormat, string> = {
  adts: 'audio/aac',
  flac: 'audio/flac',
  matroska: 'application/x-matroska',
  mp3: 'audio/mpeg',
  mp4: 'video/mp4',
  mpegts: 'video/mp2t',
  ogg: 'audio/ogg',
  webm: 'video/webm',
};

export const MP4_FRAGMENTED_OPTIONS = {
  movflags: 'frag_keyframe+empty_moov+default_base_moof',
} as const;

/**
 * @param format Description.
 * @returns Result.
 */
export function isAllowedOutputFormat(
  format: string | undefined,
): format is StreamableOutputFormat {
  return STREAMABLE_OUTPUT_FORMATS.includes(format as StreamableOutputFormat);
}
