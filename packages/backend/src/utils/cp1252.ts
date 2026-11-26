/**
 * cp1252 (WinAnsi) coverage check for the 14 PDF standard fonts.
 * Standard fonts encode one byte per glyph; this tells the caller which
 * characters cannot be drawn and must either be stripped, replaced or
 * handled by an embedded font.
 */

/** The set of unicode code points representable in WinAnsiEncoding. */
const WINANSI = new Set<number>();

for (let cp = 0x20; cp <= 0x7e; cp += 1) WINANSI.add(cp);
for (let cp = 0xa0; cp <= 0xff; cp += 1) WINANSI.add(cp);
// cp1252 higher range (0x80-0x9f), excluding the undefined slots 0x81/0x8d/0x8f/0x90/0x9d.
for (const cp of [
  0x20_ac, // €
  0x20_1a, // ‚
  0x01_92, // ƒ
  0x20_1e, // „
  0x20_26, // …
  0x20_20, // †
  0x20_21, // ‡
  0x02_c6, // ˆ
  0x20_30, // ‰
  0x01_60, // Š
  0x20_39, // ‹
  0x01_52, // Œ
  0x01_7d, // Ž
  0x20_18, // ‘
  0x20_19, // ’
  0x20_1c, // “
  0x20_1d, // ”
  0x20_22, // •
  0x20_13, // –
  0x20_14, // —
  0x02_dc, // ˜
  0x21_22, // ™
  0x01_61, // š
  0x20_3a, // ›
  0x01_53, // œ
  0x01_7e, // ž
  0x01_78, // Ÿ
]) {
  WINANSI.add(cp);
}

/**
 * Lists the distinct unencodable characters of a text, capped for error reporting.
 * @param text - The text to probe.
 * @param limit - Maximum number of distinct offending characters to report (default 10).
 * @returns Up to `limit` distinct characters (with code points) that WinAnsi cannot encode.
 */
export function findUnencodableWinAnsi(
  text: string,
  limit = 10,
): Array<{ char: string; codePoint: number }> {
  const seen = new Map<number, string>();
  for (const char of text) {
    const codePoint = char.codePointAt(0) ?? 0; // for..of always yields a full code point
    if (!WINANSI.has(codePoint) && !seen.has(codePoint)) {
      seen.set(codePoint, char);
      if (seen.size >= limit) break;
    }
  }
  return [...seen].map(([codePoint, char]) => ({ char, codePoint }));
}
