import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';
import { defineConfig } from 'vite';

// `VITE_PROXY_TARGET` overrides the API origin in dev (e.g. http://app:3000 in compose).
// eslint-disable-next-line deslint/no-hardcoded-localhost -- documented dev default; VITE_PROXY_TARGET overrides it (compose sets http://app:3000)
const proxyTarget = process.env.VITE_PROXY_TARGET ?? 'http://localhost:3000';
const proxy = Object.fromEntries(
  [
    '/metrics',
    '/health',
    '/swagger',
    '/image',
    '/audio',
    '/video',
    '/signature',
    '/virus-scan',
  ].map((path) => [path, { changeOrigin: true, target: proxyTarget }]),
);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({ autoCodeSplitting: true, target: 'react' }),
    react(),
  ],
  server: {
    port: 5173,
    proxy,
  },
});
