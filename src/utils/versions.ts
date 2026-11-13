import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require_ = createRequire(import.meta.url);

/**
 * Reads an installed package's version from its `package.json`.
 *
 * Subpath imports such as `require('sharp/package.json')` are blocked by
 * those packages' `exports` maps, so the entry point is resolved first and
 * the directory tree is walked upward until the matching `package.json`
 * is found.
 * @param name The package name to look up.
 * @returns The package version string.
 */
function packageVersion(name: string): string {
  let dir = dirname(require_.resolve(name));
  for (let depth = 0; depth < 6; depth += 1) {
    let raw: string;
    try {
      // eslint-disable-next-line security/detect-non-literal-fs-filename -- path is built from the resolved package entry walking to its own package.json, not user input
      raw = readFileSync(join(dir, 'package.json'), 'utf8');
    } catch {
      dir = dirname(dir);
      continue;
    }
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object'
      && parsed !== null
      && 'name' in parsed
      && 'version' in parsed
      && parsed.name === name
      && typeof parsed.version === 'string'
    ) {
      return parsed.version;
    }
    dir = dirname(dir);
  }
  throw new Error(`Cannot resolve version for package "${name}"`);
}

/** Version of the installed `pdq-wasm` package. */
export const PDQ_WASM_VERSION: string = packageVersion('pdq-wasm');
/** Version of the installed `node-av` package (media backend). */
export const NODE_AV_VERSION: string = packageVersion('node-av');
/** Version of the installed `sharp` package. */
export const SHARP_VERSION: string = packageVersion('sharp');
