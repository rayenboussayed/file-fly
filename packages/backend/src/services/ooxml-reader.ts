import { unzipSync } from 'fflate';

/** Hard limits applied to every OOXML package read, enforced before inflating. */
export const OOXML_LIMITS = {
  /** Maximum number of zip entries inspected (central directory scan). */
  maxEntries: 10_000,
  /** Maximum uncompressed size of a single entry. */
  maxEntryUncompressed: 32 * 1024 * 1024,
  /** Maximum uncompressed bytes of the whole package. */
  maxTotalUncompressed: 256 * 1024 * 1024,
} as const;

/** Error thrown for any OOXML structural problem; maps to HTTP 400/415 at the boundary. */
export class OoxmlError extends Error {}

/**
 * Opens an OOXML package (docx/pptx/xlsx) from a buffer and extracts its parts.
 * Packages are ordinary zips; the signature interceptor guarantees the mime, while
 * this validates the zip structure itself with conservative caps.
 *
 * In-memory only by design; entries are never written to disk.
 */
export class OoxmlReader {
  /**
   * Reads the parts as utf-8 strings.
   * @param parts - The parts returned by {@link OoxmlReader.readParts}.
   * @param name - Zip path of the part to read.
   * @returns The utf-8 text, or `undefined` when the part is absent.
   */
  static partText(parts: Map<string, Buffer>, name: string): string | undefined {
    return parts.get(name)?.toString('utf-8');
  }

  /**
   * Reads every entry of the package into memory.
   * @param buffer - The full, already upload-capped file.
   * @returns The parts, keyed by zip path (e.g. `docProps/core.xml`).
   * @throws {OoxmlError} On structural problems: invalid zip, entry count, or uncompressed size caps.
   */
  static readParts(buffer: Buffer): Map<string, Buffer> {
    const state = { entries: 0, reason: '', total: 0 };
    const filter = (info: { compression: number; name: string; originalSize: number; }) => {
      state.entries += 1;
      if (state.entries > OOXML_LIMITS.maxEntries && !state.reason) {
        state.reason = `too many entries (over ${OOXML_LIMITS.maxEntries})`;
        return false;
      }
      if (info.originalSize > OOXML_LIMITS.maxEntryUncompressed && !state.reason) {
        state.reason = `entry "${info.name}" exceeds the per-entry cap`;
        return false;
      }
      if (info.compression !== 0 && info.compression !== 8 && !state.reason) {
        state.reason = `entry "${info.name}" uses an unsupported compression method`;
        return false;
      }
      state.total += info.originalSize;
      if (state.total > OOXML_LIMITS.maxTotalUncompressed && !state.reason) {
        state.reason = 'package exceeds the total uncompressed size cap';
        return false;
      }
      return true;
    };
    let extracted: Record<string, Uint8Array>;
    try {
      extracted = unzipSync(buffer, { filter });
    } catch {
      throw new OoxmlError('not a valid zip package');
    }
    if (state.reason) {
      throw new OoxmlError(state.reason);
    }
    const parts = new Map<string, Buffer>();
    for (const [name, bytes] of Object.entries(extracted)) {
      parts.set(name, Buffer.from(bytes));
    }
    if (parts.size === 0) {
      throw new OoxmlError('package has no readable entries');
    }
    return parts;
  }
}
