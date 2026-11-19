import { zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import { parseOoxmlMetadata } from './ooxml-meta.js';
import { OoxmlReader } from './ooxml-reader.js';

const read = (entries: Record<string, string>) =>
  OoxmlReader.readParts(
    Buffer.from(
      zipSync(
        Object.fromEntries(
          Object.entries(entries).map(([name, value]) => [name, Buffer.from(value, 'utf8')]),
        ),
      ),
    ),
  );

describe('parseOoxmlMetadata', () => {
  it('normalizes a Word core.xml and app.xml', () => {
    const parts = read({
      'docProps/app.xml':
        '<Properties xmlns="http://schemas.microsoft.com/office/2006/extended-properties"><Application>Microsoft Word</Application><AppVersion>16.0</AppVersion><Company>Acme</Company><Pages>3</Pages><Words>1200</Words></Properties>',
      'docProps/core.xml':
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/"><dc:title>Title</dc:title><dc:creator>Ada</dc:creator><dc:subject>Docs</dc:subject><dc:description>Desc</dc:description><cp:keywords>a,b</cp:keywords><cp:lastModifiedBy>Bob</cp:lastModifiedBy><cp:revision>7</cp:revision><dcterms:created>2026-01-02T00:00:00Z</dcterms:created><dcterms:modified>2026-01-03T00:00:00Z</dcterms:modified></cp:coreProperties>',
    });
    expect(parseOoxmlMetadata(parts)).toMatchObject({
      application: 'Microsoft Word',
      appVersion: '16.0',
      company: 'Acme',
      created: '2026-01-02T00:00:00Z',
      creator: 'Ada',
      description: 'Desc',
      keywords: 'a,b',
      lastModifiedBy: 'Bob',
      modified: '2026-01-03T00:00:00Z',
      pages: '3',
      revision: '7',
      subject: 'Docs',
      title: 'Title',
      words: '1200',
    });
  });

  it('normalizes a PowerPoint package', () => {
    const parts = read({
      'docProps/app.xml':
        '<Properties><Application>Microsoft PowerPoint</Application><Slides>9</Slides></Properties>',
      'docProps/core.xml':
        '<coreProperties><title>Deck</title><creator>Carol</creator></coreProperties>',
    });
    expect(parseOoxmlMetadata(parts)).toMatchObject({
      application: 'Microsoft PowerPoint',
      creator: 'Carol',
      slides: '9',
      title: 'Deck',
    });
  });

  it('returns empty fields when docProps parts are missing', () => {
    const parts = read({ 'ppt/presentation.xml': '<p:presentation/>' });
    const meta = parseOoxmlMetadata(parts);
    expect(meta.title).toBeUndefined();
    expect(meta.application).toBeUndefined();
  });

  it('tolerates malformed XML parts without throwing', () => {
    const parts = read({
      'docProps/app.xml': '<AlsoUnclosed',
      'docProps/core.xml': '<unclosed',
    });
    const meta = parseOoxmlMetadata(parts);
    expect(meta.title).toBeUndefined();
    expect(meta.application).toBeUndefined();
  });
});

  it('returns undefined for nil elements and missing parts', () => {
    const parts = read({
      'docProps/core.xml':
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator><dc:inner>nested</dc:inner></dc:creator></cp:coreProperties>',
    });
    const meta = parseOoxmlMetadata(parts);
    expect(meta.creator).toBeUndefined();
    expect(parseOoxmlMetadata(new Map())).toEqual({
      application: undefined,
      company: undefined,
      created: undefined,
      creator: undefined,
      description: undefined,
      keywords: undefined,
      lastModifiedBy: undefined,
      modified: undefined,
      revision: undefined,
      subject: undefined,
      title: undefined,
    });
  });
describe('parseOoxmlMetadata edge nodes', () => {
  it('unwraps CDATA sections and numeric-typed values', () => {
    const parts = read({
      'docProps/core.xml':
        '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title><![CDATA[Spreadsheet & Co]]></dc:title><cp:revision>42</cp:revision></cp:coreProperties>',
    });
    const meta = parseOoxmlMetadata(parts);
    expect(meta.title).toBe('Spreadsheet & Co');
    expect(meta.revision).toBe('42');
  });
});
