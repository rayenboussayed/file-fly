import { describe, expect, it } from 'vitest';

import { requestContentType } from './http.js';

describe('requestContentType', () => {
  it('returns the present content-type header', () => {
    const cls = {
      request: () => ({ headers: { 'content-type': 'application/json' } }),
    };
    expect(requestContentType(cls as never)).toBe('application/json');
  });

  it('returns an empty string when the header is missing', () => {
    const cls = { request: () => ({ headers: {} }) };
    expect(requestContentType(cls as never)).toBe('');
  });

  it('returns an empty string when there is no request', () => {
    const cls = { request: () => undefined };
    expect(requestContentType(cls as never)).toBe('');
  });

  it('returns the header verbatim including parameters', () => {
    const cls = {
      request: () => ({
        headers: { 'content-type': 'text/csv; charset=utf-8' },
      }),
    };
    expect(requestContentType(cls as never)).toBe('text/csv; charset=utf-8');
  });
});
