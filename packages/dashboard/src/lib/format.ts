/**
 * Formats a byte count with binary (1024) units.
 * @param bytes - Size in bytes; non-finite or negative values format as `0 B`.
 * @returns Human-readable string such as `1.5 GB`.
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  const fixed = (value: number) => value.toFixed(value >= 10 ? 0 : 1);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${fixed(bytes / 1024)} KB`;
  if (bytes < 1024 ** 3) return `${fixed(bytes / 1024 ** 2)} MB`;
  if (bytes < 1024 ** 4) return `${fixed(bytes / 1024 ** 3)} GB`;
  return `${fixed(bytes / 1024 ** 4)} TB`;
}

/**
 * Formats a count with thousands separators.
 * @param value - The count to format.
 * @returns Locale-formatted string such as `1,234,567`.
 */
export function formatCount(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

/**
 * Turns an ISO hour bucket into an axis label like `11-17 14:00`.
 * @param bucket - ISO hour bucket, e.g. `2026-11-17T14`.
 * @returns Day and hour, e.g. `11-17 14:00`; `00:00` for malformed input.
 */
export function formatHourBucket(bucket: string): string {
  const match = /^\d{4}-(\d{2})-(\d{2})T(\d{2})/.exec(bucket);
  if (!match) return '00:00';
  return `${match[1]}-${match[2]} ${match[3]}:00`;
}

/**
 * Formats a duration given in milliseconds.
 * @param ms - Duration in milliseconds; non-finite or negative values format as `0 ms`.
 * @returns String such as `12.3 ms`.
 */
export function formatMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0 ms';
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)} s`;
  return `${ms.toFixed(1)} ms`;
}

/**
 * Formats a ratio as a percentage.
 * @param ratio - Value in the range [0, 1].
 * @param digits - Number of decimals to show.
 * @returns Percent string such as `87.5%`, or `0%` for non-finite input.
 */
export function formatPercent(ratio: number, digits = 1): string {
  if (!Number.isFinite(ratio)) return '0%';
  return `${(Math.min(1, Math.max(0, ratio)) * 100).toFixed(digits)}%`;
}
