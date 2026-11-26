/**
 * Compares two strings by UTF-16 code unit, matching JavaScript's default sort order.
 * @param left - Left string.
 * @param right - Right string.
 * @returns A negative, zero or positive number for ascending order.
 */
export function compareCodeUnits(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
