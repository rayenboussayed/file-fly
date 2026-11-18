import {
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { zipSync } from 'fflate';
import { Readable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';

import { DocxService } from './docx.service.js';

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
    sourceDirection: () => ({ set: () => undefined }),
    sourceStream: () => ({ get: () => stream, set: () => undefined }),
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
      sourceDirection: () => ({ set: () => undefined }),
      sourceStream: () => ({ get: () => stream, set: () => undefined }),
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
      sourceDirection: () => ({ set: () => undefined }),
      sourceStream: () => ({ get: () => Readable.from([Buffer.from('PK')]), set: () => undefined }),
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
    const error = await service
      .build({
        sections: [
          {
            children: [
              { data: 'aW1hZ2U=', height: 10, imageType: 'svg', type: 'image', width: 10 },
            ],
          },
        ],
      })
      .catch((caught: unknown) => caught);
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
    const service = makeService(Buffer.from('PK\x03\x04\x01\x02')).service;
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
});
