import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    env: { NODE_ENV: "development" },
    globals: true,
    include: ['**/*.e2e-spec.ts'],
    root: './',
  },
});
