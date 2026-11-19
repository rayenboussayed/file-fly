import fs from 'node:fs';
import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

// Replace fontkit for this file only: the stub's `layout`/`encode`/`getGlyph` throw,
// exercising the service's 400 error mapping. `gate.cff` flips the font between
// TrueType and CFF-outline flavors per test.
const gate = vi.hoisted(() => ({ cff: true, getNameThrows: false, throwString: false }));

vi.mock('fontkit', async () => {
  const actual = await vi.importActual<typeof import('fontkit')>('fontkit');
  const fontStub = {
    ascent: 1901,
    availableFeatures: ['kern'],
    bbox: { maxX: 1, maxY: 1, minX: 0, minY: 0 },
    capHeight: 1200,
    characterSet: [65],
    copyright: 'stub',
    createSubset() {
      return {
        encode(): Uint8Array {
          if (gate.throwString) throw 'subset string explosion' as never;
          throw new Error('subset exploded');
        },
        includeGlyph() {
          return true;
        },
      };
    },
    descent: -483,
    get directory() {
      return { tables: gate.cff ? { 'CFF ': {} } : {} };
    },
    familyName: 'StubSans',
    fullName: 'StubSans',
    getGlyph(): never {
      throw new Error('glyph directory exploded');
    },
    getName() {
      if (gate.getNameThrows) throw new Error('name table exploded');
      return 'stub-license';
    },
    glyphsForString() {
      return [{ advanceWidth: 1000, bbox: {}, codePoints: [65], id: 1, isLigature: false, isMark: false, name: 'A' }];
    },
    italicAngle: 0,
    layout(): never {
      if (gate.throwString) throw 'shaper string explosion' as never;
      throw new Error('shaper exploded');
    },
    lineGap: 0,
    numGlyphs: 1,
    'OS/2': {
      fsType: {
        bitmapOnly: false,
        editable: false,
        noEmbedding: false,
        noSubsetting: false,
        viewOnly: false,
      },
      usWeightClass: 400,
    },
    postscriptName: 'StubSans',
    subfamilyName: 'Book',
    underlinePosition: -100,
    underlineThickness: 80,
    unitsPerEm: 2048,
    variationAxes: {},
    version: 'Version 1.0',
    xHeight: 1000,
  };
  return {
    ...actual,
    create: () => fontStub,
    openSync: () => fontStub,
  };
});

import { FontService } from './font.service.js';

const fixture = () => fs.readFileSync('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf');

const makeService = (body: Buffer) => {
  const stream = Readable.from([body]);
  const cls = {
    request: () => ({ headers: { 'content-type': 'font/ttf' }, method: 'POST', raw: stream }),
    sourceDirection: () => ({ set: () => undefined }),
    sourceStream: () => ({ get: () => stream, set: () => undefined }),
  };
  return new FontService(cls as never);
};

describe('FontService error mapping (stubbed fontkit)', () => {
  it('maps a shaper explosion to 400 FONT_SHAPE_FAILED', async () => {
    gate.cff = false;
    const service = makeService(fixture());
    await expect(service.shape({ text: 'Hello' })).rejects.toMatchObject({
      response: { code: 'FONT_SHAPE_FAILED' },
    });
  });

  it('rejects CFF-based fonts for subsetting with 400 FONT_SUBSET_UNSUPPORTED', async () => {
    gate.cff = true;
    const service = makeService(fixture());
    await expect(service.subset({ text: 'Hello' })).rejects.toMatchObject({
      response: { code: 'FONT_SUBSET_UNSUPPORTED' },
    });
  });

  it('maps a subset encode explosion to 400 FONT_SUBSET_FAILED', async () => {
    gate.cff = false;
    const service = makeService(fixture());
    await expect(service.subset({ text: 'Hello' })).rejects.toMatchObject({
      response: { code: 'FONT_SUBSET_FAILED' },
    });
  });

  it('maps an unreadable glyph directory in extract to 400 FONT_UNREADABLE', async () => {
    gate.cff = false;
    const service = makeService(fixture());
    await expect(service.extract({})).rejects.toMatchObject({
      response: { code: 'FONT_UNREADABLE' },
    });
  });
  it('maps a non-Error shaper failure to 400 with String(error)', async () => {
    gate.cff = false;
    gate.throwString = true;
    const service = makeService(fixture());
    await expect(service.shape({ text: 'Hello' })).rejects.toMatchObject({
      response: { code: 'FONT_SHAPE_FAILED', message: 'shaping failed: shaper string explosion' },
    });
    gate.throwString = false;
  });

  it('maps a non-Error subset failure to 400 with String(error)', async () => {
    gate.cff = false;
    gate.throwString = true;
    const service = makeService(fixture());
    await expect(service.subset({ text: 'Hello' })).rejects.toMatchObject({
      response: { code: 'FONT_SUBSET_FAILED', message: 'subset failed: subset string explosion' },
    });
    gate.throwString = false;
  });

  it('maps a getName explosion in metadata to 400 FONT_UNREADABLE', async () => {
    gate.cff = false;
    gate.getNameThrows = true;
    const service = makeService(fixture());
    await expect(service.metadata({})).rejects.toMatchObject({
      response: { code: 'FONT_UNREADABLE' },
    });
    gate.getNameThrows = false;
  });
});
