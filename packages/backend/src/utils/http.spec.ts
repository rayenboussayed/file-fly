import { describe, expect, it } from 'vitest';

import { requestMime } from './http.js';

describe('requestMime', () => {
  it('returns the media type from a header', () => {
    const cls = { request: () => ({ headers: { 'content-type': 'application/json' } }) };
    expect(requestMime(cls as never)).toBe('application/json');
  });

  it('returns an empty string when the header is missing', () => {
    const cls = { request: () => ({ headers: {} }) };
    expect(requestMime(cls as never)).toBe('');
  });

  it('returns an empty string when there is no request', () => {
    const cls = { request: () => undefined };
    expect(requestMime(cls as never)).toBe('');
  });

  it('drops header parameters and surrounding whitespace', () => {
    const cls = { request: () => ({ headers: { 'content-type': ' text/csv ; charset=utf-8' } }) };
    expect(requestMime(cls as never)).toBe('text/csv');
  });
});
