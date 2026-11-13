import tsconfigPaths from 'vite-tsconfig-paths';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    coverage: {
      exclude: [
        'src/bin/**',
        'src/index.ts',
        // Perf/memory suites run outside the 100% coverage gate.
        'test/mem/**',
        '**/*.bench.ts',
      ],
      include: ['src/**/*.ts'],
      provider: 'v8',
      reporter: ['text', 'json'],
      reportOnFailure: true,
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
    env: { NODE_ENV: "development" },
    // The memory suite has its own runner (vitest.config.mem.ts, --expose-gc).
    exclude: [...configDefaults.exclude, 'test/mem/**'],
    fileParallelism: false,
    globals: true,
    include: ['**/*.spec.ts'],
    root: './',
  },
});
