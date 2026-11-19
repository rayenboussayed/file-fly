import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';

import { FontService } from './font.service.js';
import { FONT_MIMES, type FontMetaType, isFontMime } from './schema.js';

const fontBuffer = () =>
  fs.readFileSync('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf');

const makeService = (body: Buffer, contentType = 'font/ttf') => {
  const stream = Readable.from([body]);
  const cls = {
    request: () => ({ headers: { 'content-type': contentType }, method: 'POST', raw: stream }),
    sourceDirection: () => ({ set: () => undefined }),
    sourceStream: () => ({ get: () => stream, set: () => undefined }),
  };
  return new FontService(cls as never);
};

describe('isFontMime', () => {
  it('accepts the supported container mimes', () => {
    for (const mime of FONT_MIMES) {
      expect(isFontMime(mime)).toBe(true);
    }
    expect(isFontMime('image/png')).toBe(false);
    expect(isFontMime('application/octet-stream')).toBe(false);
  });
});

describe('FontService.metadata', () => {
  it('returns normalized metrics and name table for DejaVu Sans', async () => {
    const service = makeService(fontBuffer());
    const meta = await service.metadata({} as FontMetaType);

    expect(meta).toMatchObject({
      availableFeatures: expect.arrayContaining(['kern']) as unknown as string[],
      embedding: { noEmbedding: false, noSubsetting: false },
      familyName: 'DejaVu Sans',
      format: 'ttf',
      numGlyphs: expect.any(Number) as unknown as number,
      postscriptName: 'DejaVuSans',
      subfamilyName: 'Book',
      unitsPerEm: 2048,
    });
    expect(meta.version).toContain('2.37');
    expect(meta.characterSetSize).toBeGreaterThan(5000);
    expect(meta.license).toContain('copyright');
    expect(meta.variationAxes).toEqual({});
  });

  it('rejects a non-font signature with 415', async () => {
    const service = makeService(Buffer.from('not a font'), 'application/octet-stream');
    await expect(service.metadata({})).rejects.toMatchObject({ status: 415 });
  });

  it('rejects non-font content types with 415', async () => {
    const service = makeService(fontBuffer(), 'image/png');
    await expect(service.metadata({})).rejects.toMatchObject({ status: 415 });
  });

  it('maps a missing source stream to a client error, not a 500', async () => {
    const cls = {
      request: () => ({ headers: { 'content-type': 'font/ttf' }, method: 'POST' }),
      sourceDirection: () => ({ set: () => undefined }),
      sourceStream: () => ({ get: () => undefined, set: () => undefined }),
    };
    const service = new FontService(cls as never);
    await expect(service.metadata({})).rejects.toMatchObject({
      response: { code: 'FONT_NO_SOURCE' },
    });
  });
});

describe('FontService.extract', () => {
  it('extracts every glyph and the character set', async () => {
    const service = makeService(fontBuffer());
    const extract = await service.extract({});

    expect(extract.numGlyphs).toEqual(extract.glyphs.length);
    expect(extract.numGlyphs).toBeGreaterThan(6000);
    expect(extract.glyphs[43]).toMatchObject({ advanceWidth: expect.any(Number), id: 43 });
    expect(extract.glyphs.some((glyph) => (glyph.codePoints as number[]).includes(65))).toBe(true);
    expect(extract.returnedGlyphs).toBe(extract.numGlyphs);
  });
});

describe('FontService.shape', () => {
  it('shapes with defaults (latn, ltr)', async () => {
    const service = makeService(fontBuffer());
    const run = await service.shape({ text: 'Hello' });

    expect(run.script).toBe('latn');
    expect(run.direction).toBe('ltr');
    expect(run.advanceWidth).toBeGreaterThan(0);
    expect(run.glyphs).toHaveLength(5);
    expect(run.glyphs[0]).toMatchObject({ codePoints: [72], id: expect.any(Number) });
  });

  it('applies feature overrides (-kern)', async () => {
    const off = await makeService(fontBuffer()).shape({ features: '-kern', text: 'AV' });
    const on = await makeService(fontBuffer()).shape({ text: 'AV' });

    expect(off.advanceWidth).not.toEqual(on.advanceWidth);
    expect(off.features['kern']).toBe(false);
  });

  it('detects arabic script and rtl direction', async () => {
    const service = makeService(fontBuffer());
    const run = await service.shape({ text: 'مرحبا' });

    expect(run.script).toBe('arab');
    expect(run.direction).toBe('rtl');
  });

  it('parses feature strings into boolean records', async () => {
    const on = await makeService(fontBuffer()).shape({ features: '+liga,-kern, smcp', text: 'Hello' });
    expect(on.features).toMatchObject({ kern: false, liga: true, smcp: true });

    const plain = await makeService(fontBuffer()).shape({ text: 'Hello' });
    expect(plain.features['kern']).toBe(true);
  });
});

describe('FontService.subset', () => {
  it('produces a minimal sfnt containing only the needed glyphs', async () => {
    const service = makeService(fontBuffer());
    const subset = await service.subset({ text: 'Hello' });

    expect(subset.length).toBeGreaterThan(0);
    expect(subset.subarray(0, 4).toString('latin1')).toBe('true'); // sfnt magic
  });
});

describe('FontService collections and containers', () => {
  const fixture = (name: string) => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- name is a test constant
    return fs.readFileSync(path.join('assets', 'fonts', name));
  };

  it('opens a TTC and selects members by PostScript name', async () => {
    const sans = await makeService(fixture('tiny.ttc'), 'font/collection').metadata({ font: 'TinySans' });
    expect(sans.format).toBe('collection');
    expect(sans.familyName).toBe('Tiny Sans');
    expect(sans.collection).toEqual(['TinySans', 'TinySerif']);

    const serif = await makeService(fixture('tiny.ttc'), 'font/collection').metadata({ font: 'TinySerif' });
    expect(serif.familyName).toBe('Tiny Serif');
  });

  it('defaults to the first collection member when none is given', async () => {
    const meta = await makeService(fixture('tiny.ttc'), 'font/collection').metadata({});
    expect(meta.postscriptName).toBe('TinySans');
  });

  it('rejects an unknown collection member with 400 and lists the members', async () => {
    await expect(
      makeService(fixture('tiny.ttc'), 'font/collection').metadata({ font: 'NoSuchMember' }),
    ).rejects.toMatchObject({ response: { code: 'FONT_UNKNOWN_MEMBER' } });
  });

  it('rejects a truncated-but-signed font with 400 FONT_UNREADABLE', async () => {
    const tiny = fixture('tiny.ttf');
    await expect(makeService(tiny.subarray(0, 200), 'font/ttf').metadata({})).rejects.toMatchObject({
      response: { code: 'FONT_UNREADABLE' },
    });
  });

  it('reads WOFF and WOFF2 containers', async () => {
    const woff = await makeService(fixture('tiny.woff'), 'font/woff').metadata({});
    expect(woff.format).toBe('woff');
    expect(woff.familyName).toBe('Tiny Sans');

    const woff2 = await makeService(fixture('tiny.woff2'), 'font/woff2').metadata({});
    expect(woff2.format).toBe('woff2');
  });

  it('subsets a collection member', async () => {
    const bytes = await makeService(fixture('tiny.ttc'), 'font/collection').subset({ font: 'TinySerif', text: 'Hi' });
    expect(bytes.length).toBeGreaterThan(0);
    expect(bytes.subarray(0, 4).toString('latin1')).toBe('true');
  });

  it('tolerates empty feature tokens in the sequence', async () => {
    const run = await makeService(fontBuffer()).shape({ features: 'liga,,-kern,', text: 'Hello' });
    expect(run.features['kern']).toBe(false);
  });

  it('rejects malformed feature tags with 400', async () => {
    await expect(makeService(fontBuffer()).shape({ features: 'kernn', text: 'Hello' })).rejects.toMatchObject({
      response: { code: 'FONT_INVALID_FEATURE' },
    });
    await expect(makeService(fontBuffer()).shape({ features: 'liga,-', text: 'Hello' })).rejects.toMatchObject({
      response: { code: 'FONT_INVALID_FEATURE' },
    });
  });
});

describe('FontService edge cases', () => {
  const fixture = (name: string) => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- name is a test constant
    return fs.readFileSync(path.join('assets', 'fonts', name));
  };

  it('rejects a member name on a standalone font with 400', async () => {
    await expect(
      makeService(fixture('tiny.ttf'), 'font/ttf').metadata({ font: 'TinySans' }),
    ).rejects.toMatchObject({ response: { code: 'FONT_UNKNOWN_MEMBER' } });
  });
});

describe('FontService.extract limit', () => {
  it('returns only the requested number of glyph records', async () => {
    const extract = await makeService(fontBuffer()).extract({ limit: 10 });
    expect(extract.glyphs).toHaveLength(10);
    expect(extract.numGlyphs).toBeGreaterThan(6000);
    expect(extract.returnedGlyphs).toBe(10);
  });
});
