import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        'src/main.tsx',
        'src/routeTree.gen.ts',
        'src/**/*.spec.{ts,tsx}',
      ],
      include: ['src/**/*.{ts,tsx}'],
      provider: 'v8',
      reporter: ['text', 'json'],
      thresholds: {
        branches: 95,
        functions: 98,
        lines: 95,
        statements: 95,
      },
    },
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.spec.{ts,tsx}'],
  },
});
