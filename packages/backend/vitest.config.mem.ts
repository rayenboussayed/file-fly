import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

/**
 * Memory-regression suite: heap/arrayBuffer deltas after forced GC.
 *
 * Opt-in suite, not part of `npm run check`. Runs serially with `--expose-gc`
 * so tests can settle the heap before comparing counters (see
 * docs/performance.md and test/mem/helpers.ts). Kept out of the unit config
 * (which excludes test/mem/**) so `--expose-gc` is the only way these run.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    env: { NODE_ENV: 'development' },
    execArgv: ['--expose-gc'],
    fileParallelism: false,
    globals: true,
    hookTimeout: 60_000,
    include: ['test/mem/**/*.spec.ts'],
    root: './',
    testTimeout: 60_000,
  },
});
