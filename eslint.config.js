import { browser, createConfig, playwright } from '@stackrb/eslint-config';

const CODE_FILES = '**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}';

const config = createConfig({
  extraIgnores: [
    '**/test-results/**',
    '**/test/results/**',
    'packages/backend/docs/**',
    'packages/dashboard/docs/**',
    'packages/dashboard/src/routeTree.gen.ts',
  ],
  nodeVersion: '>=24.0.0',
  target: ['node', 'react'],
});

export default [
  // The package applies Playwright to every test file. Keep those rules on the
  // Playwright suite, where they belong, with every rule still enabled.
  ...config.filter((block) => !block.name?.startsWith('stackrb/playwright')),
  ...playwright().map((block) => ({
    ...block,
    files: ['packages/dashboard/test/e2e/**/*.ts'],
  })),
  // The dashboard is browser code. Apply the package's own browser target so
  // browser globals are recognised and Node feature checks do not apply to it.
  ...browser().map((block) => ({ ...block, files: [`packages/dashboard/${CODE_FILES}`] })),
  // Fastify's callback, SheetJS blank cells, the XLSX wire response, clamd's
  // inconclusive verdict and the persisted worker cache-key tag require a real
  // null. undefined changes those contracts.
  {
    files: [
      'packages/backend/src/bootstrap.ts',
      'packages/backend/src/resources/xlsx/xlsx.service.ts',
      'packages/backend/src/resources/xlsx/xlsx.service.spec.ts',
      'packages/backend/src/services/anti-virus.service.spec.ts',
      'packages/backend/src/services/worker.service.ts',
      'packages/backend/src/services/worker.service.spec.ts',
    ],
    rules: { 'unicorn/no-null': 'off' },
  },
  // This generator writes to the file and output paths supplied on its command line.
  {
    files: ['packages/backend/scripts/union-to-enum.js'],
    rules: { 'security/detect-non-literal-fs-filename': 'off' },
  },
];
