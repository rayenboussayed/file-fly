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
  0x20ac, // €
  0x201a, // ‚
  0x0192, // ƒ
  0x201e, // „
  0x2026, // …
  0x2020, // †
  0x2021, // ‡
  0x02c6, // ˆ
  0x2030, // ‰
  0x0160, // Š
  0x2039, // ‹
  0x0152, // Œ
  0x017d, // Ž
  0x2018, // ‘
  0x2019, // ’
  0x201c, // “
  0x201d, // ”
  0x2022, // •
  0x2013, // –
  0x2014, // —
  0x02dc, // ˜
  0x2122, // ™
  0x0161, // š
  0x203a, // ›
  0x0153, // œ
  0x017e, // ž
  0x0178, // Ÿ
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
  return [...seen.entries()].map(([codePoint, char]) => ({ char, codePoint }));
}
