import tsconfigPaths from 'vite-tsconfig-paths';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    coverage: {
      exclude: [
        'src/bin/**',
        'src/index.ts',
        // Entry-point glue; the full server (bootstrap, CORS, swagger, hooks)
        // is exercised by the 129-test e2e suite, which boots dist/main.js.
        'src/main.ts',
        // Module-init wiring (pino bootstrap logger, Nest module setup, undici
        // global dispatcher): runs at import time, exercised by every e2e boot.
        'src/logging/bootstrap-logger.ts',
        'src/app.module.ts',
        'src/undici.ts',
        // Perf/memory suites run outside the 100% coverage gate.
        'test/mem/**',
        '**/*.bench.ts',
      ],
      include: ['src/**/*.ts'],
      provider: 'v8',
      reporter: ['text', 'json'],
      reportOnFailure: true,
      thresholds: {
        // T12 decision: 100% was unreachable without gaming; the floor is honest.
        // Remaining uncovered arms are documented as: Nest decorator downlevel emit
        // (~20 arms), unreachable-by-construction guards (SheetJS always emits these,
        // split() always yields a first element, resolveFont throws rather than returns
        // falsy), and worker standalone-exit glue exercised by spawned-worker paths.
        // Baseline was 76.48% stmts / 67.44% branch.
        branches: 94,
        functions: 95,
        lines: 95,
        statements: 95,
      },
    },
    env: { DASHBOARD_DIR: "test/results/no-such-dashboard", METRICS_DIR: "test/results/metrics", NODE_ENV: "development" },
    // The memory suite has its own runner (vitest.config.mem.ts, --expose-gc).
    exclude: [...configDefaults.exclude, 'test/mem/**'],
    fileParallelism: false,
    globals: true,
    include: ['**/*.spec.ts'],
    root: './',
  },
});
