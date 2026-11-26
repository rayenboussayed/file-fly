import { UnsupportedMediaTypeException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { guardSignature } from './signature-guard.js';

describe('guardSignature', () => {
  it('allows matching routes whose signature passes the predicate', () => {
    const cls = {
      fileSignature: () => ({ get: () => ({ mime: 'audio/mpeg' }) }),
      request: () => ({ url: '/audio' }),
    };
    const next = { handle: () => 'next' };
    expect(
      guardSignature(
        '/audio',
        () => true,
        'File is not audio',
        cls as never,
        next as never,
      ),
    ).toBe('next');
  });

  it('rejects matching routes whose signature fails the predicate', () => {
    const cls = {
      fileSignature: () => ({ get: () => ({ mime: 'image/png' }) }),
      request: () => ({ url: '/audio' }),
    };
    const handle = vi.fn(() => 'next');
    const next = { handle };
    let thrown: unknown;
    try {
      guardSignature(
        '/audio',
        () => false,
        'File is not audio',
        cls as never,
        next as never,
      );
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(UnsupportedMediaTypeException);
    expect((thrown as Error).message).toBe('File is not audio');
    expect(handle).not.toHaveBeenCalled();
  });

  it('forwards the probed mime to the predicate', () => {
    const cls = {
      fileSignature: () => ({ get: () => ({ mime: 'audio/mpeg' }) }),
      request: () => ({ url: '/audio' }),
    };
    const next = { handle: () => 'next' };
    const predicate = vi.fn(() => true);
    guardSignature(
      '/audio',
      predicate,
      'File is not audio',
      cls as never,
      next as never,
    );
    expect(predicate).toHaveBeenCalledWith('audio/mpeg');
  });

  it('passes through non-matching routes untouched', () => {
    const cls = {
      fileSignature: () => ({ get: () => ({ mime: 'image/png' }) }),
      request: () => ({ url: '/health' }),
    };
    const next = { handle: () => 'next' };
    expect(
      guardSignature(
        '/audio',
        () => false,
        'File is not audio',
        cls as never,
        next as never,
      ),
    ).toBe('next');
  });

  it('passes through when no signature was probed', () => {
    const cls = {
      fileSignature: () => ({ get: () => {} }),
      request: () => ({ url: '/audio' }),
    };
    const next = { handle: () => 'next' };
    expect(
      guardSignature(
        '/audio',
        () => false,
        'File is not audio',
        cls as never,
        next as never,
      ),
    ).toBe('next');
  });
});
