import { describe, expect, it } from 'vitest';

import { DocxBuildSchema } from './schema.js';

const withRun = (run: Record<string, unknown>) => ({
  sections: [{ children: [{ runs: [run], type: 'paragraph' }] }],
});

describe('DocxBuildSchema', () => {
  it('accepts a run with superScript but not subScript', () => {
    expect(() => DocxBuildSchema.parse(withRun({ subScript: false, superScript: true, text: 'x' }))).not.toThrow();
  });

  it('rejects a run that sets superScript and subScript together', () => {
    expect(() => DocxBuildSchema.parse(withRun({ subScript: true, superScript: true, text: 'x' }))).toThrowError(
      /superScript and subScript are mutually exclusive/,
    );
  });

  it('parses every table-cell element variant through the lazy schemas', () => {
    const parsed = DocxBuildSchema.parse({
      sections: [
        {
          children: [
            {
              rows: [
                [
                  { children: [{ runs: [{ text: 'p' }], type: 'paragraph' }] },
                  { children: [{ data: 'AAAA', height: 1, imageType: 'png', type: 'image', width: 1 }] },
                  { children: [{ runs: [{ text: 'l' }], type: 'hyperlink', url: 'https://example.com' }] },
                  { children: [{ children: [{ text: 'b' }], name: 'bm', type: 'bookmark' }] },
                  { children: [{ id: 1, type: 'commentRef' }] },
                ],
              ],
              type: 'table',
            },
          ],
        },
      ],
    });
    const cells = (parsed.sections[0]?.children[0] as { rows: Array<Array<{ children: Array<{ type: string }> }>> })
      .rows[0];
    expect(cells?.map((cell) => cell.children.at(0)?.type)).toEqual([
      'paragraph',
      'image',
      'hyperlink',
      'bookmark',
      'commentRef',
    ]);
  });
});
