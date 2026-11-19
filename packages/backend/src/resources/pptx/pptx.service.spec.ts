import { UnsupportedMediaTypeException } from '@nestjs/common';
import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

import type { PptxBuildType } from './schema.js';

import { buildPresentation } from './elements.js';
import { PptxService } from './pptx.service.js';
import { PptxGenJs } from './pptxgenjs.js';

const fixturePayload: PptxBuildType = {
  layout: 'LAYOUT_16x9',
  metadata: { author: 'Fixture Author', title: 'Fixture Deck' },
  slides: [
    {
      elements: [
        {
          align: 'left',
          h: 1,
          runs: [{ bold: true, text: 'Fixture Heading' }],
          type: 'text',
          w: 8,
          x: 1,
          y: 1,
        },
      ],
      notes: 'fixture notes',
    },
    {
      elements: [
        {
          h: 1,
          runs: [{ text: 'Second slide text' }],
          type: 'text',
          w: 8,
          x: 1,
          y: 1,
        },
      ],
    },
  ],
};

const buildPptxBytes = async (payload: PptxBuildType = fixturePayload) =>
  buildPresentation(new PptxGenJs(), payload);

const makeService = (
  body: Buffer,
  contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
) => {
  const stream = Readable.from([body]);
  const cls = {
    request: () => ({ headers: { 'content-type': contentType }, method: 'POST', raw: stream }),
    sourceDirection: () => ({ set: () => undefined }),
    sourceStream: () => ({ get: () => stream, set: () => undefined }),
  };
  const workerService = {
    createWorker: vi.fn(async () => Readable.from([Buffer.from('worker-bytes')])),
  };
  return { cls, service: new PptxService(cls as never, workerService as never), workerService };
};

describe('PptxService.build', () => {
  it('sets the cache key and spawns the worker', async () => {
    const setCacheKey = vi.fn();
    const valid = await buildPptxBytes();
    const cls = {
      cacheKey: () => ({ set: setCacheKey }),
      request: () => ({ headers: {}, method: 'POST', raw: Readable.from([Buffer.from('PK')]) }),
      sourceDirection: () => ({ set: () => undefined }),
      sourceStream: () => ({ get: () => Readable.from([Buffer.from('PK')]), set: () => undefined }),
    };
    const workerService = {
      createWorker: vi.fn(async () => Readable.from([valid])),
    };
    const service = new PptxService(cls as never, workerService as never);
    await service.build(fixturePayload);
    expect(setCacheKey).toHaveBeenCalledOnce();
    expect(workerService.createWorker).toHaveBeenCalledOnce();
  });

  it('sets an identical cache key for identical payloads', async () => {
    const setCacheKey = vi.fn();
    const valid = await buildPptxBytes();
    const cls = {
      cacheKey: () => ({ set: setCacheKey }),
      request: () => ({ headers: {}, method: 'POST', raw: Readable.from([Buffer.from('PK')]) }),
      sourceDirection: () => ({ set: () => undefined }),
      sourceStream: () => ({ get: () => Readable.from([Buffer.from('PK')]), set: () => undefined }),
    };
    const workerService = {
      createWorker: vi.fn(async () => Readable.from([valid])),
    };
    const service = new PptxService(cls as never, workerService as never);
    await service.build(fixturePayload);
    await service.build(fixturePayload);
    expect(setCacheKey).toHaveBeenCalledTimes(2);
    expect(setCacheKey.mock.calls[0]).toEqual(setCacheKey.mock.calls[1]);
  });
});

describe('PptxService.metadata', () => {
  it('returns the format tag and parsed properties', async () => {
    const bytes = await buildPptxBytes();
    const service = makeService(bytes).service;
    const meta = await service.metadata();
    expect(meta.format).toBe('pptx');
  });

  it('rejects a non-presentation signature with 415', async () => {
    const service = makeService(Buffer.from('not-a-pptx'), 'application/octet-stream').service;
    await expect(service.metadata()).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });

  it('rejects non-pptx content types with 415', async () => {
    const bytes = await buildPptxBytes();
    const service = makeService(bytes, 'text/csv').service;
    await expect(service.metadata()).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });

  it('maps a truncated zip to 415', async () => {
    const service = makeService(Buffer.from('PK\x03\x04\x01\x02')).service;
    await expect(service.metadata()).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });
});

describe('PptxService.extract', () => {
  it('extracts slide texts in presentation order', async () => {
    const bytes = await buildPptxBytes();
    const service = makeService(bytes).service;
    const result = await service.extract();
    expect(result.format).toBe('pptx');
    expect(result.structure.slides).toHaveLength(2);
    expect(result.structure.slides[0]?.texts).toContain('Fixture Heading');
    expect(result.structure.slides[1]?.texts).toContain('Second slide text');
    expect(result.structure.text).toContain('Fixture Heading');
    expect(result.structure.text).toContain('Second slide text');
    expect(result.structure.notes.join('\n')).toContain('fixture notes');
  });

  it('maps a missing source stream to a client error, not a 500', async () => {
    const cls = {
      request: () => ({ headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }, method: 'POST' }),
      sourceDirection: () => ({ set: () => undefined }),
      sourceStream: () => ({ get: () => undefined, set: () => undefined }),
    };
    const service = new PptxService(cls as never, { createWorker: vi.fn() } as never);
    await expect(service.extract()).rejects.toMatchObject({
      response: { code: 'PPTX_NO_SOURCE' },
    });
  });

  it('maps oversized media entries to 413', async () => {
    const { zipSync } = await import('fflate');
    const bytes = Buffer.from(
      zipSync({
        '[Content_Types].xml': Buffer.from(
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
            '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
            '</Types>',
          'utf8',
        ),
        'ppt/media/big.bin': Buffer.alloc(33 * 1024 * 1024, 7),
        'ppt/presentation.xml': Buffer.from('<p:presentation xmlns:p="p"><p:sldIdLst/></p:presentation>', 'utf8'),
      }),
    );
    const service = makeService(bytes).service;
    await expect(service.metadata()).rejects.toMatchObject({ status: 413 });
  });

  it('throws 400 for a missing slide part referenced by sldIdLst', async () => {
    const { zipSync } = await import('fflate');
    const bytes = Buffer.from(
      zipSync({
        '[Content_Types].xml': Buffer.from(
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
            '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
            '</Types>',
          'utf8',
        ),
        'ppt/_rels/presentation.xml.rels': Buffer.from(
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
            '<Relationship Id="rIdX" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide9.xml"/>' +
            '</Relationships>',
          'utf8',
        ),
        'ppt/presentation.xml': Buffer.from(
          '<p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst><p:sldId id="256" r:id="rIdX"/></p:sldIdLst></p:presentation>',
          'utf8',
        ),
      }),
    );
    const service = makeService(bytes).service;
    await expect(service.extract()).rejects.toMatchObject({
      response: { code: 'PPTX_SLIDE_MISSING' },
    });
  });

  it('maps a truncated zip to 415', async () => {
    const service = makeService(Buffer.from('PK\x03\x04\x01\x02')).service;
    await expect(service.extract()).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });

  it('throws 400 for a valid zip that is missing presentation.xml', async () => {
    const { zipSync } = await import('fflate');
    const bytes = Buffer.from(
      zipSync({
        '[Content_Types].xml': Buffer.from(
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
            '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
            '</Types>',
          'utf8',
        ),
        'ppt/presentation.xml.rels': Buffer.from('<Relationships/>', 'utf8'),
      }),
    );
    const service = makeService(bytes).service;
    await expect(service.extract()).rejects.toMatchObject({
      response: { code: 'PPTX_NOT_A_PRESENTATION' },
    });
  });
});

describe('PptxService.build integrity', () => {
  const payload = fixturePayload;

  it('rejects when the worker returns zero bytes', async () => {
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const workerService = {
      createWorker: vi.fn(async () => Readable.from([])),
    };
    const service = new PptxService(cls as never, workerService as never);
    await expect(service.build(payload)).rejects.toThrow('invalid document');
  });

  it('rejects when the worker returns invalid bytes', async () => {
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const workerService = {
      createWorker: vi.fn(async () => Readable.from([Buffer.from('not-a-zip')])),
    };
    const service = new PptxService(cls as never, workerService as never);
    await expect(service.build(payload)).rejects.toThrow('invalid document');
  });

  it('rejects a non-http hyperlink before spawning the worker', async () => {
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const service = new PptxService(cls as never, { createWorker: vi.fn() } as never);
    await expect(
      service.build({
        layout: 'LAYOUT_16x9',
        slides: [
          {
            elements: [
              {
                h: 1,
                runs: [{ hyperlink: { url: 'javascript:alert(1)' }, text: 'link' }],
                type: 'text',
                w: 4,
                x: 1,
                y: 1,
              },
            ],
          },
        ],
      }),
    ).rejects.toMatchObject({ response: { code: 'PPTX_HYPERLINK_SCHEME_NOT_ALLOWED' } });
  });

  it('rejects a row wider than the table grid (pptxgenjs derives tblGrid from row 0)', async () => {
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const service = new PptxService(cls as never, { createWorker: vi.fn() } as never);
    await expect(
      service.build({
        layout: 'LAYOUT_16x9',
        slides: [
          {
            elements: [
              {
                h: 2,
                rows: [
                  [{ text: 'grid is 2' }, { text: 'wide' }],
                  [{ colSpan: 3, text: 'overflow' }],
                ],
                type: 'table',
                w: 4,
                x: 1,
                y: 1,
              },
            ],
          },
        ],
      }),
    ).rejects.toMatchObject({ response: { code: 'PPTX_ROW_WIDER_THAN_GRID' } });
  });

  it('rejects a rowSpan exceeding the remaining rows', async () => {
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const service = new PptxService(cls as never, { createWorker: vi.fn() } as never);
    await expect(
      service.build({
        layout: 'LAYOUT_16x9',
        slides: [
          {
            elements: [
              {
                h: 2,
                rows: [
                  [{ rowSpan: 3, text: 'a' }, { text: 'b' }],
                  [{ text: 'c' }],
                ],
                type: 'table',
                w: 4,
                x: 1,
                y: 1,
              },
            ],
          },
        ],
      }),
    ).rejects.toMatchObject({ response: { code: 'PPTX_ROWSPAN_EXCEEDS_ROWS' } });
  });
});

describe('PptxService validation branches', () => {
  it('rejects a hyperlink with a disallowed scheme before spawning the worker', async () => {
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const service = new PptxService(cls as never, { createWorker: vi.fn() } as never);
    await expect(
      service.build({
        layout: 'LAYOUT_16x9',
        slides: [
          {
            elements: [
              {
                h: 1,
                runs: [{ hyperlink: { url: 'file:///etc/passwd' }, text: 'x' }],
                type: 'text',
                w: 4,
                x: 1,
                y: 1,
              },
            ],
          },
        ],
      }),
    ).rejects.toMatchObject({ response: { code: 'PPTX_HYPERLINK_SCHEME_NOT_ALLOWED' } });
  });

  it('tolerates hyperlinks without a url (plain anchors slide/url xor)', async () => {
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const valid = await buildPptxBytes();
    const service = new PptxService(cls as never, {
      createWorker: vi.fn(async () => Readable.from([valid])),
    } as never);
    await expect(
      service.build({
        layout: 'LAYOUT_16x9',
        slides: [
          {
            elements: [
              {
                h: 1,
                runs: [{ hyperlink: { slide: 2 }, text: 'x' }],
                type: 'text',
                w: 4,
                x: 1,
                y: 1,
              },
            ],
          },
        ],
      }),
    ).resolves.toBeInstanceOf(Buffer);
  });

  it('rejects a cell whose colSpan makes its row wider than the grid', async () => {
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const service = new PptxService(cls as never, { createWorker: vi.fn() } as never);
    await expect(
      service.build({
        layout: 'LAYOUT_16x9',
        slides: [
          {
            elements: [
              {
                h: 2,
                rows: [[{ text: 'grid is 1 wide' }], [{ colSpan: 3, text: 'too wide' }]],
                type: 'table',
                w: 4,
                x: 1,
                y: 1,
              },
            ],
          },
        ],
      }),
    ).rejects.toMatchObject({ response: { code: 'PPTX_ROW_WIDER_THAN_GRID' } });
  });

  it('rejects a presentation whose presentation.xml has no sldIdLst', async () => {
    const { zipSync } = await import('fflate');
    const bytes = Buffer.from(
      zipSync({
        '[Content_Types].xml': Buffer.from(
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
            '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
            '</Types>',
          'utf8',
        ),
        'ppt/presentation.xml': Buffer.from('<p:presentation xmlns:p="p"></p:presentation>', 'utf8'),
      }),
    );
    const service = makeService(bytes).service;
    await expect(service.extract()).rejects.toMatchObject({
      response: { code: 'PPTX_NOT_A_PRESENTATION' },
    });
  });

  it('resolves absolute and backslash slide relationship targets', async () => {
    const { zipSync } = await import('fflate');
    const build = async (target: string) =>
      Buffer.from(
        zipSync({
          '[Content_Types].xml': Buffer.from(
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
              '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
              '</Types>',
            'utf8',
          ),
          'ppt/_rels/presentation.xml.rels': Buffer.from(
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
              `<Relationship Id="rIdX" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="${target}"/>` +
              '</Relationships>',
            'utf8',
          ),
          'ppt/presentation.xml': Buffer.from(
            '<p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst><p:sldId id="256" r:id="rIdX"/></p:sldIdLst></p:presentation>',
            'utf8',
          ),
          'ppt/slides/slide1.xml': Buffer.from(
            '<p:sld xmlns:p="p"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>hello</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>',
            'utf8',
          ),
        }),
      );
    for (const target of ['/ppt/slides/slide1.xml', 'slides\\slide1.xml', 'slides/slide1.xml']) {
      const service = makeService(await build(target)).service;
      const result = await service.extract();
      expect(result.structure.slides[0]?.texts).toContain('hello');
    }
  });

  it('rejects an oversize media entry with 413', async () => {
    const { zipSync } = await import('fflate');
    const big = Buffer.alloc(40 * 1024 * 1024, 0x5a);
    const bytes = Buffer.from(
      zipSync(
        {
          '[Content_Types].xml': Buffer.from(
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
              '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
              '</Types>',
            'utf8',
          ),
          'ppt/media/big.bin': big,
          'ppt/presentation.xml': Buffer.from('<p:presentation xmlns:p="p"><p:sldIdLst/></p:presentation>', 'utf8'),
        },
        { level: 0 },
      ),
    );
    const service = makeService(bytes).service;
    await expect(service.metadata()).rejects.toMatchObject({ status: 413 });
  });

  it('rejects worker output that is not a readable archive as invalid document', async () => {
    const { zipSync } = await import('fflate');
    const bytes = Buffer.from(
      zipSync({
        'unrelated.txt': Buffer.from('not a presentation', 'utf8'),
      }),
    );
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const service = new PptxService(cls as never, {
      createWorker: vi.fn(async () => Readable.from([bytes])),
    } as never);
    await expect(service.build(fixturePayload)).rejects.toThrow('invalid document');
  });

  it('rejects a non-PPTX content type with 415', async () => {
    const service = makeService(fixturePayload as never, 'image/png').service;
    // readBody rejects before any signature work; build uses JSON so exercise metadata instead
    await expect(service.metadata()).rejects.toMatchObject({ status: 415 });
  });
});

describe('PptxService remaining branches', () => {
  it('answers 413 when a single entry exceeds the per-entry cap (but total is under it)', async () => {
    const { zipSync } = await import('fflate');
    const entry = Buffer.alloc(33 * 1024 * 1024, 0x41);
    const bytes = Buffer.from(zipSync({
      '[Content_Types].xml': Buffer.from('<Types/>', 'utf8'),
      'ppt/media/big.bin': entry,
      'ppt/presentation.xml': Buffer.from('<p:presentation xmlns:p="p"><p:sldIdLst/></p:presentation>', 'utf8'),
    }, { level: 0 }));
    const service = makeService(bytes).service;
    await expect(service.metadata()).rejects.toMatchObject({ status: 413 });
  });

  it('accepts an https hyperlink', async () => {
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const valid = await buildPptxBytes();
    const service = new PptxService(cls as never, {
      createWorker: vi.fn(async () => Readable.from([valid])),
    } as never);
    await expect(
      service.build({
        layout: 'LAYOUT_16x9',
        slides: [
          {
            elements: [
              {
                h: 1,
                runs: [{ hyperlink: { url: 'https://example.com' }, text: 'link' }],
                type: 'text',
                w: 4,
                x: 1,
                y: 1,
              },
            ],
          },
        ],
      }),
    ).resolves.toBeInstanceOf(Buffer);
  });

  it('rejects payloads with more than 50k element objects', async () => {
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const service = new PptxService(cls as never, { createWorker: vi.fn() } as never);
    const huge = {
      layout: 'LAYOUT_16x9',
      slides: [
        {
          elements: Array.from({ length: 51_000 }, () => ({
            h: 1,
            runs: [{ text: 'x' }],
            type: 'text',
            w: 1,
            x: 0,
            y: 0,
          })),
        },
      ],
    } as never;
    await expect(service.build(huge)).rejects.toMatchObject({ status: 413 });
  });

  it('tolerates a table whose rows are not arrays', async () => {
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const valid = await buildPptxBytes();
    const service = new PptxService(cls as never, {
      createWorker: vi.fn(async () => Readable.from([valid])),
    } as never);
    const rowless = {
      layout: 'LAYOUT_16x9',
      slides: [
        {
          elements: [
            { h: 2, rows: 'not-an-array', type: 'table', w: 4, x: 0, y: 0 },
          ],
        },
      ],
    } as never;
    await expect(service.build(rowless)).resolves.toBeInstanceOf(Buffer);
  });

  it('treats a non-array row in a table as zero-width (defensive guard)', async () => {
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const valid = await buildPptxBytes();
    const service = new PptxService(cls as never, {
      createWorker: vi.fn(async () => Readable.from([valid])),
    } as never);
    const odd = {
      layout: 'LAYOUT_16x9',
      slides: [
        {
          elements: [
            {
              h: 2,
              rows: [['x'], 'not-a-row'],
              type: 'table',
              w: 4,
              x: 0,
              y: 0,
            },
          ],
        },
      ],
    } as never;
    await expect(service.build(odd)).resolves.toBeInstanceOf(Buffer);
  });

  it('reads spans from options.colspan/rowspan', async () => {
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const service = new PptxService(cls as never, { createWorker: vi.fn() } as never);
    await expect(
      service.build({
        layout: 'LAYOUT_16x9',
        slides: [
          {
            elements: [
              {
                h: 2,
                rows: [
                  [{ text: 'a' }, { options: { colspan: 2 }, text: 'b' }],
                  [{ text: 'c' }, { options: { rowspan: 9 }, text: 'd' }],
                ],
                type: 'table',
                w: 4,
                x: 0,
                y: 0,
              } as never,
            ],
          },
        ],
      }),
    ).rejects.toMatchObject({ response: { code: 'PPTX_ROWSPAN_EXCEEDS_ROWS' } });
  });

  it('sorts numeric-looking notes slide parts after non-numeric ones', async () => {
    const { zipSync } = await import('fflate');
    const bytes = Buffer.from(
      zipSync({
        '[Content_Types].xml': Buffer.from(
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
            '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
            '</Types>',
          'utf8',
        ),
        'ppt/_rels/presentation.xml.rels': Buffer.from(
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
            '<Relationship Id="rIdX" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide1.xml"/>' +
            '</Relationships>',
          'utf8',
        ),
        'ppt/notesSlides/notesSlide2.xml': Buffer.from(
          '<p:notes xmlns:p="p" xmlns:a="a"><p:cSld><p:sp><p:txBody><a:p><a:r><a:t>two</a:t></a:r></a:p></p:txBody></p:sp></p:cSld></p:notes>',
          'utf8',
        ),
        'ppt/notesSlides/notesSlide10.xml': Buffer.from(
          '<p:notes xmlns:p="p" xmlns:a="a"><p:cSld><p:sp><p:txBody><a:p><a:r><a:t>ten</a:t></a:r></a:p></p:txBody></p:sp></p:cSld></p:notes>',
          'utf8',
        ),
        'ppt/notesSlides/notesSlideX.xml': Buffer.from(
          '<p:notes xmlns:p="p" xmlns:a="a"><p:cSld><p:sp><p:txBody><a:p><a:r><a:t>zzz</a:t></a:r></a:p></p:txBody></p:sp></p:cSld></p:notes>',
          'utf8',
        ),
        'ppt/presentation.xml': Buffer.from(
          '<p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst><p:sldId id="256" r:id="rIdX"/></p:sldIdLst></p:presentation>',
          'utf8',
        ),
        'ppt/slides/slide1.xml': Buffer.from(
          '<p:sld xmlns:p="p"><p:cSld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>x</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:cSld></p:sld>',
          'utf8',
        ),
      }),
    );
    const service = makeService(bytes).service;
    const result = await service.extract();
    // Non-numeric suffixes parse to NaN and sort as 0, ahead of numbered slides.
    expect(result.structure.notes).toEqual(['zzz', 'two', 'ten']);
  });
});

describe('PptxService total uncompressed cap', () => {
  it('answers 413 when the package total exceeds the cap even if each entry fits', async () => {
    const { zipSync } = await import('fflate');
    // Each entry is under the 32 MiB per-entry cap, but the 30+30+30+2 = 92 MiB total exceeds the 64 MiB cap.
    const entry = Buffer.alloc(30 * 1024 * 1024, 0x42);
    const bytes = Buffer.from(zipSync({
      '[Content_Types].xml': Buffer.from('<Types/>', 'utf8'),
      'ppt/media/a.bin': entry,
      'ppt/media/b.bin': Buffer.alloc(30 * 1024 * 1024, 0x43),
      'ppt/media/c.bin': Buffer.alloc(30 * 1024 * 1024, 0x44),
      'ppt/media/d.bin': Buffer.alloc(2 * 1024 * 1024, 0x45),
      'ppt/presentation.xml': Buffer.from('<p:presentation xmlns:p="p"><p:sldIdLst/></p:presentation>', 'utf8'),
    }, { level: 0 }));
    const service = makeService(bytes).service;
    await expect(service.metadata()).rejects.toMatchObject({ status: 413 });
  });
});

describe('PptxService content-type and relationship edges', () => {
  it('rejects a missing content-type header with 415', async () => {
    const stream = Readable.from([Buffer.from('x')]);
    const cls = {
      request: () => ({ method: 'POST', raw: stream }),
      sourceDirection: () => ({ set: () => undefined }),
      sourceStream: () => ({ get: () => stream, set: () => undefined }),
    };
    const service = new PptxService(cls as never, { createWorker: vi.fn() } as never);
    await expect(service.metadata()).rejects.toMatchObject({ status: 415 });
  });

  it('rejects a slide whose r:id has no matching relationship with 400', async () => {
    const { zipSync } = await import('fflate');
    const bytes = Buffer.from(
      zipSync({
        '[Content_Types].xml': Buffer.from(
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
            '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
            '</Types>',
          'utf8',
        ),
        'ppt/_rels/presentation.xml.rels': Buffer.from(
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>',
          'utf8',
        ),
        'ppt/presentation.xml': Buffer.from(
          '<p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst><p:sldId id="256"/></p:sldIdLst></p:presentation>',
          'utf8',
        ),
      }),
    );
    const service = makeService(bytes).service;
    await expect(service.extract()).rejects.toMatchObject({
      response: { code: 'PPTX_SLIDE_MISSING' },
    });
  });

  it('rejects a slide whose relationship target is listed but unresolvable', async () => {
    const { zipSync } = await import('fflate');
    const bytes = Buffer.from(
      zipSync({
        '[Content_Types].xml': Buffer.from(
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
            '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>' +
            '</Types>',
          'utf8',
        ),
        'ppt/_rels/presentation.xml.rels': Buffer.from(
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>',
          'utf8',
        ),
        'ppt/presentation.xml': Buffer.from(
          '<p:presentation xmlns:p="p" xmlns:r="r"><p:sldIdLst><p:sldId id="256" r:id="rIdMissing"/></p:sldIdLst></p:presentation>',
          'utf8',
        ),
      }),
    );
    const service = makeService(bytes).service;
    await expect(service.extract()).rejects.toMatchObject({
      response: { code: 'PPTX_SLIDE_MISSING', message: 'slide relationship rIdMissing is missing or unresolvable' },
    });
  });
});
