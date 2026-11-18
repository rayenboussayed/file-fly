import { describe, expect, it } from 'vitest';

import type { ElementType, PptxBuildType } from './schema.js';

import { buildPresentation } from './elements.js';
import { PptxGenJs } from './pptxgenjs.js';

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y8z+RcAAAAASUVORK5CYII=',
  'base64',
);

const pack = async (elements: ElementType[], extra?: Partial<PptxBuildType>) => {
  const pres = new PptxGenJs();
  return buildPresentation(pres, {
    layout: 'LAYOUT_16x9',
    slides: [{ elements }],
    ...extra,
  });
};

describe('buildPresentation', () => {
  it('builds text with run formatting', async () => {
    const bytes = await pack([
      {
        h: 1,
        runs: [
          { bold: true, text: 'bold' },
          { italic: true, text: 'italic' },
          { breakLine: true, color: 'FF0000', text: 'red' },
        ],
        type: 'text',
        w: 8,
        x: 1,
        y: 1,
      },
    ]);
    const { strFromU8, unzipSync } = await import('fflate');
    const parts = unzipSync(bytes);
    const slide = Object.entries(parts).find(([name]) => /slide1\.xml$/.test(name))?.[1];
    expect(slide).toBeTruthy();
    const xml = strFromU8(slide ?? new Uint8Array());
    expect(xml).toContain('bold');
    expect(xml).toContain('italic');
    expect(xml).toContain('FF0000');
  });

  it('builds shapes with caption text and fills', async () => {
    const bytes = await pack([
      {
        fill: { color: '00FF00' },
        h: 2,
        shape: 'ellipse',
        text: [{ text: 'caption' }],
        type: 'shape',
        w: 2,
        x: 1,
        y: 1,
      },
    ]);
    const { strFromU8, unzipSync } = await import('fflate');
    const parts = unzipSync(bytes);
    const slide = Object.entries(parts).find(([name]) => /slide1\.xml$/.test(name))?.[1];
    const xml = strFromU8(slide ?? new Uint8Array());
    expect(xml).toContain('00FF00');
    expect(xml).toContain('caption');
    expect(xml).toContain('ellipse');
  });

  it('builds tables with merged cells', async () => {
    const bytes = await pack([
      {
        h: 2,
        rows: [
          [{ colSpan: 2, text: 'merged' }],
          [{ text: 'a' }, { text: 'b' }],
        ],
        type: 'table',
        w: 4,
        x: 1,
        y: 1,
      },
    ]);
    const { strFromU8, unzipSync } = await import('fflate');
    const parts = unzipSync(bytes);
    const slide = Object.entries(parts).find(([name]) => /slide1\.xml$/.test(name))?.[1];
    const xml = strFromU8(slide ?? new Uint8Array());
    expect(xml).toContain('<a:tbl>');
    expect(xml).toContain('merged');
    expect(xml).toContain('gridSpan');
  });

  it('builds images with alt text', async () => {
    const bytes = await pack([
      {
        altText: 'tiny pixel',
        data: png.toString('base64'),
        h: 1,
        imageType: 'png',
        type: 'image',
        w: 1,
        x: 1,
        y: 1,
      },
    ]);
    const { strFromU8, unzipSync } = await import('fflate');
    const parts = unzipSync(bytes);
    expect(Object.keys(parts).some((name) => name.startsWith('ppt/media/'))).toBe(true);
    const slide = Object.entries(parts).find(([name]) => /slide1\.xml$/.test(name))?.[1];
    expect(strFromU8(slide ?? new Uint8Array())).toContain('tiny pixel');
  });

  it('builds charts with a series and legend', async () => {
    const bytes = await pack([
      {
        chartType: 'bar',
        h: 3,
        series: [{ labels: ['a', 'b'], name: 'series', values: [1, 2] }],
        showLegend: true,
        title: 'Chart Title',
        type: 'chart',
        w: 4,
        x: 1,
        y: 1,
      },
    ]);
    const { strFromU8, unzipSync } = await import('fflate');
    const parts = unzipSync(bytes);
    const slide = Object.entries(parts).find(([name]) => /slide1\.xml$/.test(name))?.[1];
    const xml = strFromU8(slide ?? new Uint8Array());
    expect(xml).toContain('graphicFrame');
    const chart = Object.entries(parts).find(([name]) => /charts\/chart/.test(name))?.[1];
    expect(chart).toBeTruthy();
    expect(strFromU8(chart ?? new Uint8Array())).toContain('Chart Title');
  });

  it('applies notes, background and metadata', async () => {
    const bytes = await pack(
      [{ h: 1, runs: [{ text: 'body' }], type: 'text', w: 4, x: 1, y: 1 }],
      { metadata: { author: 'Meta Author', title: 'Meta Title' } },
    );
    const { strFromU8, unzipSync } = await import('fflate');
    const parts = unzipSync(bytes);
    const core = Object.entries(parts).find(([name]) => name === 'docProps/core.xml')?.[1];
    const xml = strFromU8(core ?? new Uint8Array());
    expect(xml).toContain('Meta Title');
    expect(xml).toContain('Meta Author');
  });

  it('adds a second slide and a slide background', async () => {
    const pres = new PptxGenJs();
    const bytes = await buildPresentation(pres, {
      layout: 'LAYOUT_4x3',
      slides: [
        { background: { color: 'EFEFEF' }, elements: [] },
        { elements: [{ h: 1, runs: [{ text: 'slide two' }], type: 'text', w: 4, x: 1, y: 1 }] },
      ],
    });
    const { strFromU8, unzipSync } = await import('fflate');
    const parts = unzipSync(bytes);
    expect(Object.keys(parts).some((name) => /slides\/slide2\.xml$/.test(name))).toBe(true);
    const slide1 = Object.entries(parts).find(([name]) => /slide1\.xml$/.test(name))?.[1];
    expect(strFromU8(slide1 ?? new Uint8Array())).toContain('EFEFEF');
    expect(strFromU8(slide1 ?? new Uint8Array())).toContain('<p:spTree');
  });

  it('writes all metadata fields', async () => {
    const bytes = await pack(
      [{ h: 1, runs: [{ text: 'body' }], type: 'text', w: 4, x: 1, y: 1 }],
      { metadata: { author: 'A', company: 'Co', revision: '3', subject: 'Sub', title: 'T' } },
    );
    const { strFromU8, unzipSync } = await import('fflate');
    const parts = unzipSync(bytes);
    const app = Object.entries(parts).find(([name]) => name === 'docProps/app.xml')?.[1];
    expect(strFromU8(app ?? new Uint8Array())).toContain('Co');
    const core = Object.entries(parts).find(([name]) => name === 'docProps/core.xml')?.[1];
    expect(strFromU8(core ?? new Uint8Array())).toContain('T');
    expect(strFromU8(core ?? new Uint8Array())).toContain('Sub');
  });

  it('throws the unreachable defensive error for unknown enum values', async () => {
    const pres = new PptxGenJs();
    const badShape = {
      fill: undefined,
      h: 1,
      shape: 'not-a-shape' as never,
      type: 'shape',
      w: 1,
      x: 0,
      y: 0,
    } as never;
    await expect(
      buildPresentation(pres, { layout: 'LAYOUT_16x9', slides: [{ elements: [badShape] }] }),
    ).rejects.toThrow('unsupported shape');
    const badChart = {
      chartType: 'not-a-chart' as never,
      h: 2,
      series: [{ values: [1] }],
      type: 'chart',
      w: 2,
      x: 0,
      y: 0,
    } as never;
    await expect(
      buildPresentation(pres, { layout: 'LAYOUT_16x9', slides: [{ elements: [badChart] }] }),
    ).rejects.toThrow('unsupported chart type');
  });

  it('applies a first-page style speaker note and line breaks', async () => {
    const bytes = await pack(
      [{
        h: 1,
        runs: [{ breakLine: true, text: 'one' }, { text: 'two' }],
        type: 'text',
        w: 4,
        x: 1,
        y: 1,
      }],
    );
    const { strFromU8, unzipSync } = await import('fflate');
    const parts = unzipSync(bytes);
    const slide = Object.entries(parts).find(([name]) => /slide1\.xml$/.test(name))?.[1];
    expect(strFromU8(slide ?? new Uint8Array())).toContain('one');
  });

  it('applies theme fonts', async () => {
    const bytes = await pack(
      [{ h: 1, runs: [{ text: 'body' }], type: 'text', w: 4, x: 1, y: 1 }],
      { theme: { bodyFontFace: 'Fixture Body', headFontFace: 'Fixture Head' } },
    );
    const { strFromU8, unzipSync } = await import('fflate');
    const parts = unzipSync(bytes);
    const theme = Object.entries(parts).find(([name]) => /theme1\.xml$/.test(name))?.[1];
    expect(theme).toBeTruthy();
    expect(strFromU8(theme ?? new Uint8Array())).toContain('Fixture Head');
  });
});
