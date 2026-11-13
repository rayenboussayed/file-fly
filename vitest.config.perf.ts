import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

/**
 * Benchmarks (tinybench via `vitest bench`, v4 API).
 *
 * Opt-in suite, not part of `npm run check`: measurements are only comparable
 * on an otherwise idle, quiet machine (see docs/performance.md). Baselines are
 * kept local; nothing is committed.
 */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    benchmark: {
      // Discovery is by filename; `vitest bench` runs only these files.
      include: ['test/perf/**/*.bench.ts'],
    },
    env: { NODE_ENV: 'development' },
    fileParallelism: false,
    globals: true,
    hookTimeout: 60_000,
    root: './',
    testTimeout: 120_000,
  },
});
