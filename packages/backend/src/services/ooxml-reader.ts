import { unzipSync } from 'fflate';

/** Hard limits applied to every OOXML package read, enforced before inflating. */
const OOXML_LIMITS = {
  /** Maximum number of zip entries inspected (central directory scan). */
  maxEntries: 10_000,
  /** Maximum uncompressed size of a single entry. */
  maxEntryUncompressed: 32 * 1024 * 1024,
  /** Maximum uncompressed bytes of the whole package. */
  maxTotalUncompressed: 256 * 1024 * 1024,
} as const;

/** Override knobs for the readParts caps; defaults are the shared limits. */
export interface OoxmlReadLimits {
  /** Maximum number of zip entries inspected. */
  maxEntries?: number;
  /** Maximum uncompressed size of a single entry. */
  maxEntryUncompressed?: number;
  /** Maximum uncompressed bytes of the whole package. */
  maxTotalUncompressed?: number;
}

/** Error thrown for any OOXML structural problem; maps to HTTP 400/415 at the boundary. */
export class OoxmlError extends Error {}

/**
 * Opens an OOXML package (docx/pptx/xlsx) from a buffer and extracts its parts.
 * Packages are ordinary zips; the signature interceptor guarantees the mime, while
 * this validates the zip structure itself with conservative caps.
 *
 * In-memory only by design; entries are never written to disk.
 */
export const OoxmlReader = {
  /**
   * Reads the parts as utf-8 strings.
   * @param parts - The parts returned by {@link OoxmlReader.readParts}.
   * @param name - Zip path of the part to read.
   * @returns The utf-8 text, or `undefined` when the part is absent.
   */
  partText(parts: Map<string, Buffer>, name: string): string | undefined {
    return parts.get(name)?.toString('utf8');
  },

  /**
   * Reads every entry of the package into memory.
   *
   * fflate allocates each output buffer at the declared `originalSize`, so the
   * header caps below also bound the bytes actually inflated. Revisit this if
   * the fflate version changes that behavior.
   * @param buffer - The full, already upload-capped file.
   * @param limits - Optional per-call cap overrides.
   * @returns The parts, keyed by zip path (e.g. `docProps/core.xml`).
   * @throws {OoxmlError} On structural problems: invalid zip, entry count, or uncompressed size caps.
   */
  readParts(buffer: Buffer, limits?: OoxmlReadLimits): Map<string, Buffer> {
    const maxEntries = limits?.maxEntries ?? OOXML_LIMITS.maxEntries;
    const maxEntry = limits?.maxEntryUncompressed ?? OOXML_LIMITS.maxEntryUncompressed;
    const maxTotal = limits?.maxTotalUncompressed ?? OOXML_LIMITS.maxTotalUncompressed;
    const state = { entries: 0, reason: '', total: 0 };
    const filter = (info: { compression: number; name: string; originalSize: number }) => {
      state.entries += 1;
      if (state.entries > maxEntries && !state.reason) {
        state.reason = `too many entries (over ${maxEntries})`;
        return false;
      }
      if (info.originalSize > maxEntry && !state.reason) {
        state.reason = `entry "${info.name}" exceeds the per-entry cap`;
        return false;
      }
      if (info.compression !== 0 && info.compression !== 8 && !state.reason) {
        state.reason = `entry "${info.name}" uses an unsupported compression method`;
        return false;
      }
      state.total += info.originalSize;
      if (state.total > maxTotal && !state.reason) {
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
  },
};
