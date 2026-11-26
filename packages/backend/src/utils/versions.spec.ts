/* eslint-disable security/detect-non-literal-fs-filename -- all paths are built from a fresh mkdtemp dir, never from user input */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { packageVersion } from './versions.js';

const state: { root?: string } = {};

/**
 * Writes a JSON fixture file under the current temporary root.
 * @param relativePath - Path relative to the temporary root.
 * @param content - JSON-serializable fixture content.
 */
const tree = (relativePath: string, content: unknown) => {
  const target = path.join(state.root as string, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(content));
};

describe('packageVersion', () => {
  afterEach(() => {
    if (state.root !== undefined) fs.rmSync(state.root, { force: true, recursive: true });
    state.root = undefined;
  });

  it('walks up from a nested entry to the nearest matching package.json', () => {
    state.root = fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-version-'));
    const root = state.root;
    // An intermediate package.json without the target name is skipped; the
    // walk-up continues to the enclosing one.
    tree('pkg/package.json', { name: 'unrelated', version: '1.0.0' });
    tree('package.json', { name: 'target-pkg', version: '9.9.9' });
    expect(packageVersion('target-pkg', path.join(root, 'pkg'))).toBe('9.9.9');
  });

  it('throws for a package whose whole tree lacks a matching manifest', () => {
    state.root = fs.mkdtempSync(path.join(os.tmpdir(), 'pkg-version-missing-'));
    const root = state.root;
    tree('nested/deep/package.json', { name: 'other-pkg', version: '1.0.0' });
    expect(() => packageVersion('target-pkg', path.join(root, 'nested'))).toThrow();
  });
});
