import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { packageVersion } from './versions.js';

let root = '';

const tree = (rel: string, content: unknown) => {
  const target = path.join(root as string, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(content));
};

describe('packageVersion', () => {
  afterEach(() => {
    if (root !== '') fs.rmSync(root, { force: true, recursive: true });
    root = '';
  });

  it('walks up from a nested entry to the nearest matching package.json', () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-version-'));
    // An intermediate package.json without the target name is skipped; the
    // walk-up continues to the enclosing one.
    tree('pkg/package.json', { name: 'unrelated', version: '1.0.0' });
    tree('package.json', { name: 'target-pkg', version: '9.9.9' });
    expect(packageVersion('target-pkg', path.join(root, 'pkg'))).toBe('9.9.9');
  });

  it('throws for a package whose whole tree lacks a matching manifest', () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-version-missing-'));
    tree('nested/deep/package.json', { name: 'other-pkg', version: '1.0.0' });
    expect(() => packageVersion('target-pkg', path.join(root, 'nested'))).toThrow();
  });
});
