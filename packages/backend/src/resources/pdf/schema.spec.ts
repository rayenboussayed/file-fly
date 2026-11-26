import { describe, expect, it } from 'vitest';

import { PdfBuildSchema } from './schema.js';

const base = { pages: [{ elements: [] as never[], size: 'a4' }] };

const parse = (body: unknown) => PdfBuildSchema.safeParse(body);

describe('PdfBuildSchema', () => {
  it('applies defaults for size, orientation and margin', () => {
    const result = parse(base);
    expect(result.success).toBe(true);
    if (!result.success) {
      return;
    }

    expect(result.data.pages[0]?.size).toBe('a4');
    expect(result.data.pages[0]?.orientation).toBe('portrait');
    expect(result.data.pages[0]?.margin).toEqual({ bottom: 72, left: 72, right: 72, top: 72 });
  });

  it('rejects align center without w', () => {
    const result = parse({
      pages: [{ elements: [{ align: 'center', text: 'x', type: 'text', x: 72, y: 72 }], size: 'a4' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects colWidths that do not match the column count', () => {
    const result = parse({
      pages: [
        {
          elements: [
            {
              colWidths: [400],
              rows: [['a', 'b'], ['c', { colSpan: 2, text: 'wide' }] as never],
              type: 'table',
              w: 400,
              x: 72,
              y: 100,
            },
          ],
          size: 'a4',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects duplicate field names across pages', () => {
    const field = { fieldType: 'text', name: 'dup', type: 'field', x: 72, y: 100 };
    const result = parse({
      pages: [
        { elements: [field], size: 'a4' },
        { elements: [{ ...field, x: 72, y: 200 }], size: 'a4' },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('accepts a well-formed build with colSpan and colWidths', () => {
    const result = parse({
      pages: [
        {
          elements: [
            {
              colWidths: [100, 100, 200],
              rows: [['a', 'b', 'c'], [{ colSpan: 2, text: 'ab' }, 'c'] as never],
              type: 'table',
              w: 400,
              x: 72,
              y: 100,
            },
          ],
          size: 'a4',
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid imageType', () => {
    const result = parse({
      pages: [
        {
          elements: [{ data: 'aGVsbG8=', h: 10, imageType: 'gif', type: 'image', w: 10, x: 0, y: 0 }],
          size: 'a4',
        },
      ],
    });
    expect(result.success).toBe(false);
  });
});
