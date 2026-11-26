import {
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { zipSync } from 'fflate';
import { Readable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { OoxmlError, OoxmlReader } from '@/services/ooxml-reader.js';
import { xml } from '@/services/ooxml-xml.js';

import { DocxService } from './docx.service.js';
import { DOCX_MIME } from './schema.js';

afterEach(() => {
  vi.restoreAllMocks();
});

const CONTENT_TYPES =
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
  '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
  '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
  '</Types>';

const CORE =
  '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/">' +
  '<dc:title>Fixture Title</dc:title><dc:creator>Ada</dc:creator><dc:subject>Tests</dc:subject>' +
  '</cp:coreProperties>';

const APP =
  '<Properties xmlns="http://schemas.microsoft.com/office/2006/extended-properties"><Application>FixtureApp</Application><Pages>4</Pages></Properties>';

const buildDocx = (documentXml: string) =>
  Buffer.from(
    zipSync({
      '[Content_Types].xml': Buffer.from(CONTENT_TYPES, 'utf8'),
      'docProps/app.xml': Buffer.from(APP, 'utf8'),
      'docProps/core.xml': Buffer.from(CORE, 'utf8'),
      'word/document.xml': Buffer.from(documentXml, 'utf8'),
    }),
  );

const makeService = (body: Buffer, contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') => {
  const stream = Readable.from([body]);
  const cls = {
    cacheKey: () => ({ set: vi.fn() }),
    request: () => ({ headers: { 'content-type': contentType }, method: 'POST', raw: stream }),
    sourceDirection: () => ({ set: () => {} }),
    sourceStream: () => ({ get: () => stream, set: () => {} }),
  };
  const workerService = {
    createWorker: vi.fn(async () => Readable.from([Buffer.from('worker-bytes')])),
  };
  return { cls, service: new DocxService(cls as never, workerService as never), workerService };
};

const buildPresentationSafe = async (): Promise<Buffer> => {
  const { Document, Packer } = await import('docx');
  return Packer.toBuffer(new Document({ sections: [{ children: [] }] }));
};

describe('DocxService.build', () => {
  it('sets the cache key and spawns the worker', async () => {
    const setCacheKey = vi.fn();
    const stream = Readable.from([Buffer.from('PK')]);
    const cls = {
      cacheKey: () => ({ set: setCacheKey }),
      request: () => ({ headers: {}, method: 'POST', raw: stream }),
      sourceDirection: () => ({ set: () => {} }),
      sourceStream: () => ({ get: () => stream, set: () => {} }),
    };
    const valid = await buildPresentationSafe();
    const workerService = { createWorker: vi.fn(async () => Readable.from([valid])) };
    const service = new DocxService(cls as never, workerService as never);
    await service.build({ sections: [{ children: [] }] });
    expect(setCacheKey).toHaveBeenCalledOnce();
    expect(workerService.createWorker).toHaveBeenCalledOnce();
  });

  it('sets an identical cache key for identical payloads', async () => {
    const setCacheKey = vi.fn();
    const cls = {
      cacheKey: () => ({ set: setCacheKey }),
      request: () => ({ headers: {}, method: 'POST', raw: Readable.from([Buffer.from('PK')]) }),
      sourceDirection: () => ({ set: () => {} }),
      sourceStream: () => ({ get: () => Readable.from([Buffer.from('PK')]), set: () => {} }),
    };
    const valid = await buildPresentationSafe();
    const workerService = { createWorker: vi.fn(async () => Readable.from([valid])) };
    const service = new DocxService(cls as never, workerService as never);
    const payload = { metadata: { title: 'x' }, sections: [{ children: [] }] };
    await service.build(payload);
    await service.build(payload);
    expect(setCacheKey).toHaveBeenCalledTimes(2);
    expect(setCacheKey.mock.calls[0]).toEqual(setCacheKey.mock.calls[1]);
  });

  it('rejects an unknown footnote reference before spawning the worker', async () => {
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const service = new DocxService(cls as never, { createWorker: vi.fn() } as never);
    await expect(
      service.build({
        sections: [{ children: [{ runs: [{ footnote: 99, text: 'ref' }], type: 'paragraph' }] }],
      }),
    ).rejects.toMatchObject({ response: { code: 'DOCX_UNKNOWN_NOTE_ID' } });
  });

  it('rejects an undeclared comment id before spawning the worker', async () => {
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const service = new DocxService(cls as never, { createWorker: vi.fn() } as never);
    await expect(
      service.build({
        sections: [{ children: [{ id: 7, type: 'commentRef' }] }],
      }),
    ).rejects.toMatchObject({ response: { code: 'DOCX_UNKNOWN_COMMENT_ID' } });
  });

  it('rejects duplicate note ids', async () => {
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const service = new DocxService(cls as never, { createWorker: vi.fn() } as never);
    await expect(
      service.build({
        footnotes: [
          { children: [{ runs: [{ text: 'a' }], type: 'paragraph' }], id: 1 },
          { children: [{ runs: [{ text: 'b' }], type: 'paragraph' }], id: 1 },
        ],
        sections: [{ children: [] }],
      }),
    ).rejects.toMatchObject({ response: { code: 'DOCX_DUPLICATE_NOTE_ID' } });
  });

  it('rejects duplicate numbering references', async () => {
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const service = new DocxService(cls as never, { createWorker: vi.fn() } as never);
    await expect(
      service.build({
        numbering: [
          { levels: [{ format: 'decimal', level: 0 }], reference: 'dup' },
          { levels: [{ format: 'decimal', level: 0 }], reference: 'dup' },
        ],
        sections: [{ children: [] }],
      }),
    ).rejects.toMatchObject({ response: { code: 'DOCX_DUPLICATE_NUMBERING_REFERENCE' } });
  });

  it('rejects javascript: hyperlink URLs', async () => {
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const service = new DocxService(cls as never, { createWorker: vi.fn() } as never);
    await expect(
      service.build({
        sections: [
          {
            children: [
              {
                anchor: undefined,
                runs: [{ text: 'link' }],
                type: 'hyperlink',
                url: 'javascript:alert(1)',
              },
            ],
          },
        ],
      }),
    ).rejects.toMatchObject({ response: { code: 'DOCX_HYPERLINK_SCHEME_NOT_ALLOWED' } });
  });

  it('rejects a rowSpan exceeding the remaining rows', async () => {
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const service = new DocxService(cls as never, { createWorker: vi.fn() } as never);
    await expect(
      service.build({
        sections: [
          {
            children: [
              {
                rows: [[{ children: [{ runs: [{ text: 'x' }], type: 'paragraph' }], rowSpan: 3 }]],
                type: 'table',
              },
            ],
          },
        ],
      }),
    ).rejects.toMatchObject({ response: { code: 'DOCX_ROWSPAN_EXCEEDS_ROWS' } });
  });

  it('rejects an svg image without a fallback raster before spawning the worker', async () => {
    const setCacheKey = vi.fn();
    const cls = { cacheKey: () => ({ set: setCacheKey }) };
    const service = new DocxService(cls as never, { createWorker: vi.fn() } as never);
    let error: unknown;
    try {
      await service.build({
        sections: [
          {
            children: [
              { data: 'aW1hZ2U=', height: 10, imageType: 'svg', type: 'image', width: 10 },
            ],
          },
        ],
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(BadRequestException);
    expect(setCacheKey).not.toHaveBeenCalled();
  });
});

describe('DocxService.metadata', () => {
  it('returns normalized OOXML metadata and the format tag', async () => {
    const service = makeService(buildDocx('<w:document><w:body/></w:document>')).service;
    const meta = await service.metadata();
    expect(meta).toMatchObject({
      application: 'FixtureApp',
      creator: 'Ada',
      format: 'docx',
      pages: '4',
      subject: 'Tests',
      title: 'Fixture Title',
    });
  });

  it('maps a truncated zip to 415', async () => {
    const service = makeService(Buffer.from('PK\u{3}\u{4}\u{1}\u{2}')).service;
    await expect(service.extract()).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });

  it('maps a document missing word/document.xml to 400', async () => {
    const body = Buffer.from(
      zipSync({
        '[Content_Types].xml': Buffer.from(CONTENT_TYPES, 'utf8'),
        'docProps/core.xml': Buffer.from(CORE, 'utf8'),
      }),
    );
    const service = makeService(body).service;
    await expect(service.extract()).rejects.toMatchObject({
      response: { code: 'DOCX_NOT_A_DOCUMENT' },
    });
  });

  it('maps an oversized media entry to 413', async () => {
    const body = Buffer.from(
      zipSync({
        '[Content_Types].xml': Buffer.from(CONTENT_TYPES, 'utf8'),
        'word/document.xml': Buffer.from('<w:document/>', 'utf8'),
        'word/media/big.bin': Buffer.alloc(33 * 1024 * 1024, 7),
      }),
    );
    const service = makeService(body).service;
    await expect(service.metadata()).rejects.toBeInstanceOf(PayloadTooLargeException);
  });

  it('rejects a hyperlink with neither url nor anchor before spawning the worker', async () => {
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const service = new DocxService(cls as never, { createWorker: vi.fn() } as never);
    await expect(
      service.build({
        sections: [
          { children: [{ runs: [{ text: 'link' }], type: 'hyperlink' }] },
        ],
      }),
    ).rejects.toMatchObject({ response: { code: 'DOCX_HYPERLINK_TARGET_REQUIRED' } });
  });

  it('rejects a non-docx signature with 415', async () => {
    const service = makeService(Buffer.from('not-a-docx'), 'application/octet-stream').service;
    await expect(service.metadata()).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });
});

describe('DocxService.extract', () => {
  const documentXml =
    '<w:document><w:body>' +
    '<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Introduction</w:t></w:r></w:p>' +
    '<w:p><w:r><w:t>Hello world</w:t></w:r></w:p>' +
    '<w:p><w:pPr><w:numPr/></w:pPr><w:r><w:t>First point</w:t></w:r></w:p>' +
    '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>cell 1</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>cell 2</w:t></w:r></w:p></w:tc></w:tr></w:tbl>' +
    '<w:p><w:hyperlink r:id="rId7"><w:r><w:t>Example link</w:t></w:r></w:hyperlink></w:p>' +
    '<w:p><w:r><w:drawing><wp:docPr id="1" name="pic" descr="a cat"/></w:drawing></w:r></w:p>' +
    '</w:body></w:document>';

  it('extracts text, headings, lists, tables, links and images', async () => {
    const rels =
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId7" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com" TargetMode="External"/>' +
      '</Relationships>';
    const withRels = Buffer.from(
      zipSync({
        '[Content_Types].xml': Buffer.from(CONTENT_TYPES, 'utf8'),
        'docProps/app.xml': Buffer.from(APP, 'utf8'),
        'docProps/core.xml': Buffer.from(CORE, 'utf8'),
        'word/_rels/document.xml.rels': Buffer.from(rels, 'utf8'),
        'word/document.xml': Buffer.from(documentXml, 'utf8'),
      }),
    );
    const service = makeService(withRels).service;
    const result = await service.extract();
    expect(result.format).toBe('docx');
    expect(result.structure.headings).toEqual([{ level: 1, text: 'Introduction' }]);
    expect(result.structure.lists).toBe(1);
    expect(result.structure.tables[0]?.rows).toBe(1);
    expect(result.structure.tables[0]?.cells[0]).toEqual(['cell 1', 'cell 2']);
    expect(result.structure.hyperlinks).toEqual([{ text: 'Example link', url: 'https://example.com' }]);
    expect(result.structure.images.count).toBe(1);
    expect(result.structure.images.alts).toEqual(['a cat']);
    expect(result.text).toContain('Hello world');
    expect(result.metadata.title).toBe('Fixture Title');
  });

  it('treats a heading style without a digit as level 1', async () => {
    const documentXml =
      '<w:document><w:body><w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr>' +
      '<w:r><w:t>Named title</w:t></w:r></w:p></w:body></w:document>';
    const service = makeService(buildDocx(documentXml)).service;
    const result = await service.extract();
    expect(result.structure.headings).toEqual([{ level: 1, text: 'Named title' }]);
  });

  it('resolves anchor-only hyperlinks and ignores empty image descriptions', async () => {
    const documentXml =
      '<w:document><w:body>' +
      '<w:p><w:hyperlink w:anchor="frag"><w:r><w:t>Jump</w:t></w:r></w:hyperlink></w:p>' +
      '<w:p><w:hyperlink><w:r><w:t>Bare</w:t></w:r></w:hyperlink></w:p>' +
      '<w:p><w:r><w:drawing><wp:docPr id="1" descr=""/></w:drawing></w:r></w:p>' +
      '</w:body></w:document>';
    const service = makeService(buildDocx(documentXml)).service;
    const result = await service.extract();
    expect(result.structure.hyperlinks).toEqual([
      { text: 'Jump', url: '#frag' },
      { text: 'Bare', url: undefined },
    ]);
    expect(result.structure.images.count).toBe(1);
    expect(result.structure.images.alts).toEqual([]);
  });

  it('tolerates a null paragraph node in document.xml', async () => {
    const parse = vi.spyOn(xml, 'parse');
    parse.mockReturnValueOnce({ document: { body: { p: [null, { r: { t: 'ok' } }] } } } as never);
    const service = makeService(buildDocx('<w:document/>')).service;
    const result = await service.extract();
    expect(result.structure.headings).toEqual([]);
    expect(result.text).toBe('\nok');
  });
});

describe('DocxService body and read caps', () => {
  it('rejects an unsupported content type with a 415 describing the type', async () => {
    const service = makeService(Buffer.from('PK'), 'text/plain').service;
    await expect(service.extract()).rejects.toThrow('Unsupported media type "text/plain" for DOCX input');
  });

  it('treats a request without headers as an empty unsupported media type', async () => {
    const stream = Readable.from([Buffer.from('PK')]);
    const cls = {
      cacheKey: () => ({ set: vi.fn() }),
      request: () => {},
      sourceDirection: () => ({ set: () => {} }),
      sourceStream: () => ({ get: () => stream, set: () => {} }),
    };
    const service = new DocxService(cls as never, { createWorker: vi.fn() } as never);
    await expect(service.extract()).rejects.toThrow('Unsupported media type "" for DOCX input');
  });

  it('rejects a missing source stream with DOCX_NO_SOURCE', async () => {
    const cls = {
      cacheKey: () => ({ set: vi.fn() }),
      request: () => ({ headers: { 'content-type': DOCX_MIME } }),
      sourceDirection: () => ({ set: () => {} }),
      sourceStream: () => ({ get: () => null, set: () => {} }),
    };
    const service = new DocxService(cls as never, { createWorker: vi.fn() } as never);
    await expect(service.extract()).rejects.toMatchObject({ response: { code: 'DOCX_NO_SOURCE' } });
  });

  it('propagates a non-OOXML reader error unchanged', async () => {
    const boom = new TypeError('reader exploded');
    vi.spyOn(OoxmlReader, 'readParts').mockImplementation(() => {
      throw boom;
    });
    const service = makeService(buildDocx('<w:document/>')).service;
    await expect(service.extract()).rejects.toBe(boom);
  });

  it('maps a total-uncompressed cap violation to a 413', async () => {
    vi.spyOn(OoxmlReader, 'readParts').mockImplementation(() => {
      throw new OoxmlError('package exceeds the total uncompressed size cap');
    });
    const service = makeService(buildDocx('<w:document/>')).service;
    let error: unknown;
    try {
      await service.metadata();
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(PayloadTooLargeException);
    expect(error).toHaveProperty('message', 'package exceeds the total uncompressed size cap');
  });

  it('maps other OOXML package errors to DOCX_INVALID_ZIP', async () => {
    vi.spyOn(OoxmlReader, 'readParts').mockImplementation(() => {
      throw new OoxmlError('not a valid zip package');
    });
    const service = makeService(buildDocx('<w:document/>')).service;
    let error: unknown;
    try {
      await service.metadata();
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error).toHaveProperty('response', {
      code: 'DOCX_INVALID_ZIP',
      message: 'not a valid zip package',
    });
  });
});

describe('DocxService.build cross-field validation', () => {
  const paragraph = (text: string) => ({ runs: [{ text }], type: 'paragraph' as const });

  it('rejects duplicate endnote ids', async () => {
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const service = new DocxService(cls as never, { createWorker: vi.fn() } as never);
    await expect(
      service.build({
        endnotes: [
          { children: [paragraph('a')], id: 1 },
          { children: [paragraph('b')], id: 1 },
        ],
        sections: [{ children: [] }],
      }),
    ).rejects.toMatchObject({ response: { code: 'DOCX_DUPLICATE_NOTE_ID', message: 'duplicate endnote id 1' } });
  });

  it('rejects duplicate comment ids', async () => {
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const service = new DocxService(cls as never, { createWorker: vi.fn() } as never);
    await expect(
      service.build({
        comments: [
          { author: 'A', children: [paragraph('a')], id: 1 },
          { author: 'B', children: [paragraph('b')], id: 1 },
        ],
        sections: [{ children: [] }],
      }),
    ).rejects.toMatchObject({ response: { code: 'DOCX_DUPLICATE_COMMENT_ID', message: 'duplicate comment id 1' } });
  });

  it('rejects an undeclared endnote reference', async () => {
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const service = new DocxService(cls as never, { createWorker: vi.fn() } as never);
    await expect(
      service.build({ sections: [{ children: [{ runs: [{ endnote: 4, text: 'ref' }], type: 'paragraph' }] }] }),
    ).rejects.toMatchObject({ response: { code: 'DOCX_UNKNOWN_NOTE_ID', message: 'endnote id 4 is not declared' } });
  });

  it('rejects a payload over the 50,000 element cap', async () => {
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const service = new DocxService(cls as never, { createWorker: vi.fn() } as never);
    let error: unknown;
    try {
      await service.build({
        sections: [
          { children: [{ runs: Array.from({ length: 50_001 }, () => ({ text: '' })), type: 'paragraph' }] },
        ],
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(PayloadTooLargeException);
    expect(error).toHaveProperty('message', 'document exceeds the element cap');
  });

  it('accepts an allowed hyperlink URL and table cells without row spans', async () => {
    const setCacheKey = vi.fn();
    const stream = Readable.from([Buffer.from('PK')]);
    const cls = {
      cacheKey: () => ({ set: setCacheKey }),
      request: () => ({ headers: {}, method: 'POST', raw: stream }),
      sourceDirection: () => ({ set: () => {} }),
      sourceStream: () => ({ get: () => stream, set: () => {} }),
    };
    const valid = await buildPresentationSafe();
    const workerService = { createWorker: vi.fn(async () => Readable.from([valid])) };
    const service = new DocxService(cls as never, workerService as never);
    const bytes = await service.build({
      sections: [
        {
          children: [
            { runs: [{ text: 'link' }], type: 'hyperlink', url: 'https://example.com' },
            {
              rows: [
                [{ children: [paragraph('a')] }],
                [{ children: [paragraph('b')] }],
              ],
              type: 'table',
            },
          ],
        },
      ],
    });
    expect(bytes).toEqual(valid);
    expect(setCacheKey).toHaveBeenCalledOnce();
    expect(workerService.createWorker).toHaveBeenCalledOnce();
  });

  it('tolerates malformed table shapes in the defensive rowSpan guards', async () => {
    // These guards exist precisely to survive shapes the schema would reject.
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const valid = await buildPresentationSafe();
    const workerService = { createWorker: vi.fn(async () => Readable.from([valid])) };
    const service = new DocxService(cls as never, workerService as never);
    const malformed = [
      { rows: undefined as never, type: 'table' as const },
      { rows: [null as never], type: 'table' as const },
      { rows: [[null as never]], type: 'table' as const },
    ];
    for (const table of malformed) {
      await expect(service.build({ sections: [{ children: [table] }] })).resolves.toEqual(valid);
    }
    expect(workerService.createWorker).toHaveBeenCalledTimes(3);
  });

  it('wraps a builder output missing word/document.xml', async () => {
    const invalid = Buffer.from(zipSync({ '[Content_Types].xml': Buffer.from(CONTENT_TYPES, 'utf8') }));
    const cls = { cacheKey: () => ({ set: vi.fn() }) };
    const workerService = { createWorker: vi.fn(async () => Readable.from([invalid])) };
    const service = new DocxService(cls as never, workerService as never);
    let error: unknown;
    try {
      await service.build({ sections: [{ children: [] }] });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(Error);
    expect(error).toHaveProperty('message', 'docx builder produced an invalid document');
    expect((error as Error & { cause?: unknown }).cause).toBeDefined();
  });
});
