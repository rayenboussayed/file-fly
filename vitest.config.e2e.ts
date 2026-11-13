import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    env: { CACHE_DIR: 'test/results/cache', NODE_ENV: 'development', TESSERACT_DIR: 'cache/tesseract' },
    fileParallelism: false,
    globals: true,
    globalSetup: './test/global-setup.ts',
    hookTimeout: 60000,
    include: ['**/*.e2e-spec.ts'],
    // The app drains HTTP download bodies at FFmpeg's pace; undici (Node-internal)
    // can assert on its paused parser when the fixture server closes the socket
    // after the body was fully consumed. Ignore only that exact internal assert.
    onUnhandledError: (error) => {
      const stack =
        typeof error === 'object' && error !== null && 'stack' in error
          ? String((error as { stack?: unknown }).stack)
          : '';
      if (stack.includes('Parser.finish') && stack.includes('undici')) {
        return false;
      }
      return undefined;
    },
    root: './',
    testTimeout: 60000,
  },
});
