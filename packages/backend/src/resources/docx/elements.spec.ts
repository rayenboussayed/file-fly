import { Document, Packer } from 'docx';
import { unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import type { ElementType } from './schema.js';

import { buildBlock, buildSectionOptions } from './elements.js';

/**
 * Packs the given elements and returns the unzipped parts, for assertions.
 * @param elements - The element descriptors.
 * @returns The unzipped OOXML parts.
 */
const pack = async (elements: ElementType[]) => {
  const children = elements.flatMap((element) => buildBlock(element));
  const document = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBuffer(document);
  return unzipSync(buffer);
};

const text = (parts: ReturnType<typeof unzipSync>) =>
  Buffer.from(Object.entries(parts).find(([key]) => key === 'word/document.xml')?.[1] ?? new Uint8Array()).toString('utf8');

describe('buildBlock', () => {
  it('builds every paragraph flavor', async () => {
    const parts = await pack([
      { alignment: 'center', runs: [{ text: 'centered' }], type: 'paragraph' },
      { heading: 2, runs: [{ text: 'heading 2' }], type: 'paragraph' },
      { heading: 'title', runs: [{ text: 'the title' }], type: 'paragraph' },
      { keepLines: true, keepWithNext: true, pageBreakBefore: true, runs: [{ text: 'kept' }], type: 'paragraph' },
      { outlineLevel: 2, runs: [{ text: 'outline' }], type: 'paragraph' },
      { runs: [{ text: 'shaded' }], shading: { fill: 'FFF000', type: 'pct25' }, type: 'paragraph' },
      { runs: [{ text: 'spaced' }], spacing: { after: 12, before: 6, line: 18, lineRule: 'exact' }, type: 'paragraph' },
      { indent: { firstLine: 36, hanging: 18, left: 90, right: 45 }, runs: [{ text: 'indented' }], type: 'paragraph' },
      { runs: [{ text: 'tabbed' }], tabStops: [{ alignment: 'left', leader: 'dot', position: 9006 }], type: 'paragraph' },
      { numbering: { level: 0, reference: 'spec-list' }, runs: [{ text: 'listed' }], type: 'paragraph' },
    ]);
    const xml = text(parts);
    expect(xml).toContain('centered');
    expect(xml).toContain('heading 2');
    expect(xml).toContain('the title');
    expect(xml).toContain('pageBreakBefore');
    expect(xml).toContain('w:shd');
    expect(xml).toContain('tab');
    expect(xml).toContain('numPr');
  });

  it('builds tables with merges, borders and a header row', async () => {
    const parts = await pack([
      {
        borders: { top: { color: 'FF0000', size: 8, style: 'double' } },
        headerRow: true,
        layout: 'fixed',
        rows: [
          [
            { children: [{ runs: [{ text: 'header' }], type: 'paragraph' }] },
            { children: [{ runs: [{ text: 'header 2' }], type: 'paragraph' }] },
          ],
          [
            { children: [{ runs: [{ text: 'merged' }], type: 'paragraph' }], rowSpan: 2 },
            { children: [{ runs: [{ text: 'cell a' }], type: 'paragraph' }], colSpan: 1 },
          ],
          [{ children: [{ runs: [{ text: 'cell c' }], type: 'paragraph' }] }],
        ],
        type: 'table',
        width: 11_000,
      },
    ]);
    const xml = text(parts);
    expect(xml).toContain('<w:tbl>');
    expect(xml).toContain('w:tblHeader');
    expect(xml).toContain('FF0000');
    expect(xml).toContain('merged');
    expect(xml).toContain('header 2');
  });

  it('builds images (png) with alt text', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y8z+RcAAAAASUVORK5CYII=',
      'base64',
    );
    const parts = await pack([
      {
        altText: 'a tiny pixel',
        data: png.toString('base64'),
        height: 10,
        imageType: 'png',
        type: 'image',
        width: 10,
      },
    ]);
    expect(Object.keys(parts)).toEqual(expect.arrayContaining(['word/media/image1.png']));
    expect(text(parts)).toContain('<w:drawing>');
  });

  it('builds hyperlinks (url and anchor) and bookmarks', async () => {
    const parts = await pack([
      { runs: [{ text: 'a link' }], type: 'hyperlink', url: 'https://example.com' },
      { anchor: 'chapter1', runs: [{ text: 'anchor link' }], type: 'hyperlink' },
      { children: [{ text: 'bookmarked' }], name: 'chapter1', type: 'bookmark' },
    ]);
    const relsPart = parts['word/_rels/document.xml.rels'];
    expect(relsPart).toBeTruthy();
    const rels = Buffer.from(relsPart ?? new Uint8Array()).toString('utf8');
    expect(rels).toContain('https://example.com');
    expect(text(parts)).toContain('anchor="chapter1"');
    expect(text(parts)).toContain('bookmarkStart');
  });

  it('builds a commentRef as adjacent comment range markers', async () => {
    const parts = await pack([{ id: 3, type: 'commentRef' }]);
    const xml = text(parts);
    expect(xml).toContain('commentRangeStart');
    expect(xml).toContain('commentReference');
  });

  it('builds toc, thematicBreak, pageBreak and columnBreak', async () => {
    const parts = await pack([
      { heading: 1, runs: [{ text: 'Heading for TOC' }], type: 'paragraph' },
      { levels: 2, title: 'Table of contents', type: 'toc' },
      { type: 'thematicBreak' },
      { type: 'pageBreak' },
      { type: 'columnBreak' },
    ]);
    const xml = text(parts);
    expect(xml).toContain(String.raw`TOC \h \o &quot;1-2&quot;`);
    expect(xml).toContain('w:pBdr');
    expect(xml).toContain('w:type="page"');
    expect(xml).toContain('w:type="column"');
  });

  it('maps section options for columns, landscape and continuous type', () => {
    const landscape = buildSectionOptions({
      properties: {
        columns: { count: 2, spacing: 360 },
        orientation: 'landscape',
        pageSize: { height: 11_906, width: 16_848 },
        sectionType: 'continuous',
      },
    });
    expect(landscape.page?.size?.orientation).toBe('landscape');
    expect(landscape.column).toEqual({ count: 2, space: 7200 });
    expect(landscape.type).toBe('continuous');

    const defaults = buildSectionOptions({
      properties: { columns: 3, orientation: 'portrait', pageSize: { height: 1000, width: 2000 } },
    });
    expect(defaults.page?.size?.orientation).toBe('portrait');
    expect(defaults.column).toEqual({ count: 3, space: 0 });
  });

  it('builds footnote/endnote references, language and both underline forms', async () => {
    const parts = await pack([
      {
        runs: [
          { footnote: 1, text: 'fn' },
          { endnote: 2, text: 'en' },
          { language: 'en-GB', text: 'lang' },
          { text: 'underlined', underline: true },
          { text: 'wavy', underline: { color: 'FF0000', type: 'wave' } },
        ],
        type: 'paragraph',
      },
    ]);
    const xml = text(parts);
    expect(xml).toContain('<w:footnoteReference w:id="1"/>');
    expect(xml).toContain('<w:endnoteReference w:id="2"/>');
    expect(xml).toContain('<w:lang w:val="en-GB"/>');
    expect(xml).toContain('<w:u w:val="single"/>');
    expect(xml).toContain('<w:u w:val="wave" w:color="FF0000"/>');
  });

  it('builds svg images with a fallback raster and rejects svg without one', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y8z+RcAAAAASUVORK5CYII=',
      'base64',
    );
    const parts = await pack([
      {
        altText: 'svg alt',
        data: 'PHN2Zy8+',
        fallback: { data: png.toString('base64'), imageType: 'png' },
        height: 10,
        imageType: 'svg',
        type: 'image',
        width: 10,
      },
    ]);
    expect(Object.keys(parts)).toEqual(expect.arrayContaining(['word/media/image1.svg', 'word/media/image1.png']));
    expect(text(parts)).toContain('descr="svg alt"');

    const withoutAlt = await pack([
      {
        data: 'PHN2Zy8+',
        fallback: { data: png.toString('base64'), imageType: 'png' },
        height: 10,
        imageType: 'svg',
        type: 'image',
        width: 10,
      },
    ]);
    expect(text(withoutAlt)).toContain('<w:drawing>');
    expect(text(withoutAlt)).not.toMatch(/<wp:docPr[^>]*descr=/);

    await expect(
      pack([{ data: 'PHN2Zy8+', height: 10, imageType: 'svg', type: 'image', width: 10 }]),
    ).rejects.toThrow('svg images require a fallback raster');
  });

  it('builds raster images without alt text', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y8z+RcAAAAASUVORK5CYII=',
      'base64',
    );
    const parts = await pack([
      { data: png.toString('base64'), height: 10, imageType: 'png', type: 'image', width: 10 },
    ]);
    expect(Object.keys(parts)).toEqual(expect.arrayContaining(['word/media/image1.png']));
    expect(text(parts)).toContain('<w:drawing>');
  });

  it('normalizes unknown shading, tab-stop and border styles to supported defaults', async () => {
    // Deliberately invalid enum values (cast) exercise the normalizing fallbacks.
    const parts = await pack([
      { runs: [{ text: 'shade' }], shading: { fill: 'FFFFFF', type: 'bogus' as never }, type: 'paragraph' },
      {
        runs: [{ text: 'tab' }],
        tabStops: [{ alignment: 'bogus' as never, leader: 'none', position: 1000 }],
        type: 'paragraph',
      },
      {
        borders: { top: { style: 'bogus' as never } },
        rows: [[{ children: [{ runs: [{ text: 'x' }], type: 'paragraph' }] }]],
        type: 'table',
      },
    ]);
    const xml = text(parts);
    expect(xml).toContain('<w:shd w:fill="FFFFFF" w:val="clear"/>');
    expect(xml).toContain('<w:tab w:val="left" w:pos="1000"/>');
    expect(xml).toContain('<w:tblBorders>');
    expect(xml).not.toContain('bogus');
  });

  it('omits unspecified indent/spacing fields and defaults the line rule', async () => {
    const parts = await pack([
      { indent: { left: 100 }, runs: [{ text: 'ind' }], type: 'paragraph' },
      { indent: { right: 50 }, runs: [{ text: 'ind2' }], type: 'paragraph' },
      { runs: [{ text: 'sp' }], spacing: { after: 10 }, type: 'paragraph' },
      { runs: [{ text: 'sp2' }], spacing: { lineRule: 'bogus' as never }, type: 'paragraph' },
    ]);
    const xml = text(parts);
    expect(xml).toContain('<w:ind w:left="2000"/>');
    expect(xml).toContain('<w:ind w:right="1000"/>');
    expect(xml).toContain('<w:spacing w:after="200" w:lineRule="auto"/>');
    expect(xml).toContain('<w:spacing w:lineRule="auto"/>');
  });

  it('throws for a targetless hyperlink and emits nothing for unknown elements', async () => {
    await expect(pack([{ runs: [{ text: 'x' }], type: 'hyperlink' }])).rejects.toThrow(
      'hyperlink requires a url or an anchor',
    );
    expect(buildBlock({ type: 'bogus' } as never)).toEqual([]);
  });

  it('uses the default table-of-contents title when none is given', async () => {
    const parts = await pack([{ levels: 3, title: undefined as never, type: 'toc' }]);
    expect(text(parts)).toContain('w:alias w:val="Table of contents"');
    expect(text(parts)).toContain(String.raw`TOC \h \o &quot;1-3&quot;`);
  });

  it('builds all table borders and shaded, aligned, sized or empty cells', async () => {
    const parts = await pack([
      {
        borders: {
          bottom: { style: 'single' },
          insideHorizontal: { style: 'single' },
          insideVertical: { style: 'single' },
          left: { style: 'single' },
          right: { style: 'single' },
        },
        rows: [
          [
            { shading: { fill: 'FFFF00', type: 'solid' }, verticalAlign: 'center', width: 500 },
            {},
          ],
        ],
        type: 'table',
      },
      { rows: [[{}]], type: 'table' },
    ]);
    const xml = text(parts);
    expect(xml).toContain('<w:tblBorders>');
    expect(xml).toContain('<w:left w:val="single"');
    expect(xml).toContain('<w:bottom w:val="single"');
    expect(xml).toContain('<w:insideH w:val="single"');
    expect(xml).toContain('<w:insideV w:val="single"');
    expect(xml).toContain('<w:tcW w:type="dxa" w:w="500"/>');
    expect(xml).toContain('<w:shd w:fill="FFFF00" w:val="solid"/>');
    expect(xml).toContain('<w:vAlign w:val="center"/>');
  });

  it('maps explicit section margins', () => {
    const options = buildSectionOptions({
      properties: { margins: { bottom: 20, left: 30, right: 40, top: 10 } },
    });
    expect(options.page.margin).toEqual({ bottom: 20, left: 30, right: 40, top: 10 });
  });
});
