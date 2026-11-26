import { createConfig, playwright } from '@stackrb/eslint-config';
import unicorn from 'eslint-plugin-unicorn';

const CODE_FILES = '**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}';

const config = createConfig({
  extraIgnores: [
    '**/test-results/**',
    '**/test/results/**',
    'packages/backend/docs/**',
    'packages/dashboard/docs/**',
    'packages/dashboard/src/routeTree.gen.ts',
  ],
  nodeVersion: '>=22.13.0',
  target: ['node', 'react'],
});

export default [
  // The package applies Playwright to every test file. Keep those rules only on the
  // Playwright suite so Vitest specs are not checked against the wrong framework.
  ...config.filter((block) => !block.name?.startsWith('stackrb/playwright')),
  ...playwright().map((block) => ({
    ...block,
    files: ['packages/dashboard/test/e2e/**/*.ts'],
  })),
  // This repo predates unicorn's opinionated style rules. Its own unopinionated
  // preset keeps the correctness rules and drops the style-only ones.
  {
    ...unicorn.configs.unopinionated,
    files: [CODE_FILES],
  },
  {
    files: ['packages/dashboard/**/*.{ts,tsx}'],
    rules: {
      'n/no-unsupported-features/node-builtins': 'off',
      'unicorn/filename-case': ['error', { cases: { kebabCase: true, pascalCase: true } }],
    },
  },
  // This script reads and writes paths supplied by its operator. The security
  // heuristic for literal filenames cannot apply to a code generator CLI.
  {
    files: ['packages/backend/scripts/**'],
    rules: { 'security/detect-non-literal-fs-filename': 'off' },
  },
  // The backend target is ES2023, so Promise.withResolvers is typed as absent
  // even though Node 24 provides it. Keep the Promise executor form in this spec.
  {
    files: ['packages/backend/src/resources/docx/worker/worker.spec.ts'],
    rules: { 'unicorn/prefer-promise-with-resolvers': 'off' },
  },
  // These files predate the package and use promise chains, worker mocks built on
  // require/EventEmitter, and constant-key header reads. Those patterns are kept
  // so the swap changes tooling only; the scoped rules do not affect new code
  // outside these paths.
  {
    files: [
      'packages/backend/src/basic-auth.ts',
      'packages/backend/src/services/cache-janitor.service.ts',
      'packages/backend/src/services/worker.service.ts',
      'packages/backend/src/services/worker.service.spec.ts',
      'packages/backend/src/shared-services.module.spec.ts',
      'packages/backend/src/utils/open-source.spec.ts',
      'packages/backend/src/utils/pipe.ts',
      'packages/backend/src/utils/worker-exit.ts',
      'packages/backend/test/fixtures/dashboard/assets/app.abc123.js',
      'packages/backend/test/mem/worker-pool.spec.ts',
      'packages/backend/test/perf/worker-pool.bench.ts',
    ],
    rules: {
      'promise/always-return': 'off',
      'security/detect-object-injection': 'off',
      'unicorn/import-style': 'off',
      'unicorn/no-declarations-before-early-exit': 'off',
      'unicorn/no-global-object-property-assignment': 'off',
      'unicorn/no-nonstandard-builtin-properties': 'off',
      'unicorn/no-object-as-default-parameter': 'off',
      'unicorn/no-process-exit': 'off',
      'unicorn/prefer-await': 'off',
      'unicorn/prefer-event-target': 'off',
      'unicorn/prefer-module': 'off',
      'unicorn/prefer-promise-with-resolvers': 'off',
    },
  },
  // Iterator#reduce and Promise.withResolvers are absent from the ES2023 lib
  // even though Node 24 provides them; keep the typed, equivalent forms here.
  {
    files: [
      'packages/backend/src/metrics/metrics.service.ts',
      'packages/backend/src/services/worker.service.ts',
    ],
    rules: {
      'unicorn/prefer-iterator-helpers': 'off',
      'unicorn/prefer-promise-with-resolvers': 'off',
    },
  },
];
