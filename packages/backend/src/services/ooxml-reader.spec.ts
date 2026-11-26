import { zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import { OoxmlError, OoxmlReader } from './ooxml-reader.js';

const makeZip = (entries: Record<string, string | Uint8Array>) =>
  Buffer.from(
    zipSync(
      Object.fromEntries(
        Object.entries(entries).map(([name, value]) => [
          name,
          typeof value === 'string' ? Buffer.from(value, 'utf8') : value,
        ]),
      ),
    ),
  );

describe('OoxmlReader.readParts', () => {
  it('extracts the parts of a minimal package', () => {
    const zip = makeZip({
      'docProps/core.xml': '<cp:coreProperties/>',
      'word/document.xml': '<w:document/>',
    });
    const parts = OoxmlReader.readParts(zip);
    expect(parts.get('word/document.xml')?.toString('utf8')).toBe('<w:document/>');
    expect(parts.get('docProps/core.xml')?.toString('utf8')).toBe('<cp:coreProperties/>');
  });

  it('throws OoxmlError for non-zip input', () => {
    expect(() => OoxmlReader.readParts(Buffer.from('not a zip'))).toThrow(
      OoxmlError,
    );
  });

  it('throws when an entry blows the per-entry cap', () => {
    const zip = makeZip({ 'big.bin': Buffer.alloc(33 * 1024 * 1024, 7) });
    expect(() => OoxmlReader.readParts(zip)).toThrow(/per-entry cap/);
  });

  it('throws when there are too many entries', () => {
    const entries: Record<string, Uint8Array> = {};
    for (let index = 0; index < 10_001; index += 1) {
      entries[`f${index}.xml`] = new Uint8Array([1]);
    }
    expect(() => OoxmlReader.readParts(makeZip(entries))).toThrow(
      /too many entries/,
    );
  });

  it('keeps binary parts byte-exact', () => {
    const bytes = new Uint8Array([0, 1, 2, 255, 254, 0x80, 0x7f]);
    const zip = makeZip({ 'media/image1.png': bytes });
    expect(OoxmlReader.readParts(zip).get('media/image1.png')).toEqual(
      Buffer.from(bytes),
    );
  });
});

describe('OoxmlReader.partText', () => {
  it('returns undefined for a missing part', () => {
    const parts = new Map<string, Buffer>();
    expect(OoxmlReader.partText(parts, 'nope.xml')).toBeUndefined();
  });
});

describe('OoxmlReader edge containers', () => {
  it('rejects entries with an unsupported compression method', () => {
    // patch every local + central directory entry to compression method 9
    const original = Buffer.from(zipSync({ 'a.xml': Buffer.from('<a/>') }));
    const buffer = Buffer.from(original);
    for (let offset = buffer.indexOf('PK\u{3}\u{4}'); offset !== -1; offset = buffer.indexOf('PK\u{3}\u{4}', offset + 4)) {
      buffer.writeUInt16LE(9, offset + 8); // method = bzip2 (unsupported)
    }
    for (let offset = buffer.indexOf('PK\u{1}\u{2}'); offset !== -1; offset = buffer.indexOf('PK\u{1}\u{2}', offset + 4)) {
      buffer.writeUInt16LE(9, offset + 10); // central dir method
    }
    expect(() => OoxmlReader.readParts(buffer)).toThrow('unsupported compression method');
  });

  it('rejects a package with zero entries', () => {
    expect(() => OoxmlReader.readParts(Buffer.from(zipSync({})))).toThrow('package has no readable entries');
  });
});

describe('OoxmlReader total-size cap', () => {
  it('rejects a package whose combined entries exceed the total cap', () => {
    const entry = Buffer.alloc(25 * 1024 * 1024, 0x43);
    const bytes = Buffer.from(
      zipSync(
        {
          'a.xml': entry,
          'b.xml': entry,
          'c.xml': entry,
        },
        { level: 0 },
      ),
    );
    expect(() => OoxmlReader.readParts(bytes, { maxTotalUncompressed: 64 * 1024 * 1024 })).toThrow('total uncompressed');
  });
});
