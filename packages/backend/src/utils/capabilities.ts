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

/** The streamable container/codec formats `/audio|/video/processor` can emit. */
export type StreamableOutputFormat = (typeof STREAMABLE_OUTPUT_FORMATS)[number];

/** Content-Type for each streamable output format. */
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

/** Fragmented-MP4 muxer flags for progressive download without re-muxing. */
export const MP4_FRAGMENTED_OPTIONS = {
  movflags: 'frag_keyframe+empty_moov+default_base_moof',
} as const;

/**
 * @param format - Candidate container/codec format name.
 * @returns True when the format is in the streamable output allowlist.
 */
export function isAllowedOutputFormat(
  format: string | undefined,
): format is StreamableOutputFormat {
  return STREAMABLE_OUTPUT_FORMATS.includes(format as StreamableOutputFormat);
}
