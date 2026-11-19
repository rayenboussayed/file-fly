/**
 * mdaics (https://github.com/rayenboussayed/mdaics) renders one Markdown API
 * doc per source file from the JSDoc/TSDoc annotations in the source tree.
 *
 * Output is committed next to each package's source: packages/backend/docs/ and
 * packages/dashboard/docs/ hold the generated files (one .md per source file),
 * never edit them by hand — re-run `npm run docs` instead.
 */
import { defineConfig } from 'mdaics';

export default defineConfig({
  cache: true,
  cachePath: '.mdaicscache',
  outDirName: 'docs',
  // jsdoc child workers race under unbounded parallelism (nondeterministic
  // 'Jsdoc failed'); 4 is a stable, still-fast setting.
  parallelism: 4,
  rootDistDir: 'dist',
  rootSrcDir: ['packages/backend/src', 'packages/dashboard/src'],
});
