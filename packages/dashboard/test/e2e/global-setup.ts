import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { startFakeClamd, stopFakeClamd } from './support/fake-clamd.js';
import {
  BACKEND_MAIN,
  BASE_URL,
  CLAMAV_PORT,
  DASHBOARD_DIST,
  PORT,
} from './support/paths.js';

/**
 * Tiny valid JPEG (96x64, solid block) generated with sharp. Real enough for
 * `file-type` and the whole transcode path, small enough to keep the suite fast.
 */
const FIXTURE_JPEG = Buffer.from(
  '/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCABAAGADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAb/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCGAWCXAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf/2Q==',
  'base64',
);

/** How long to wait for the booted backend to answer `/health` before giving up. */
const BOOT_TIMEOUT_MS = 45_000;

/**
 * Boots the built backend (serving the real dashboard build) with a throwaway
 * metrics/cache tree and a fake clamd, then seeds a handful of cheap requests
 * so the screenshots render non-zero counters from varied client IPs.
 * @returns The teardown Playwright runs once the suite finishes.
 */
export default async function globalSetup(): Promise<() => Promise<void>> {
  const clamd = await startFakeClamd(CLAMAV_PORT);
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'file-fly-dashboard-e2e-'));
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  const backend = spawn(process.execPath, [BACKEND_MAIN], {
    env: {
      ...process.env,
      CACHE_DIR: path.join(tmp, 'cache'),
      CLAMAV_HOST: '127.0.0.1',
      CLAMAV_PORT: String(CLAMAV_PORT),
      DASHBOARD_DIR: DASHBOARD_DIST,
      EGRESS_ALLOWLIST: '127.0.0.1',
      LOG_LEVEL: 'warn',
      METRICS_DIR: path.join(tmp, 'metrics'),
      METRICS_FLUSH_INTERVAL_MS: '50',
      NODE_ENV: 'development',
      PORT: String(PORT),
      TESSERACT_DIR: path.join(tmp, 'tesseract'),
      TRUST_PROXY: 'true',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  backend.stdout.on('data', (chunk: Buffer) => stdout.push(chunk));
  backend.stderr.on('data', (chunk: Buffer) => stderr.push(chunk));

  const logs = (): string => Buffer.concat([...stdout, ...stderr]).toString('utf8');
  const teardown = async (): Promise<void> => {
    await stopBackend(backend);
    await stopFakeClamd(clamd);
    await fs.rm(tmp, { force: true, recursive: true });
  };

  try {
    await waitForHealth(backend, logs);
    await seedTraffic();
  } catch (error) {
    await teardown();
    throw error;
  }

  return teardown;
}

/**
 * Seeds deterministic-ish demo traffic through the booted backend: five image
 * uploads (one is a cache hit) and two virus scans from four synthetic IPs plus
 * loopback. Throws with the response body if any request does not succeed —
 * screenshots of a broken boot are worse than no screenshots.
 */
async function seedTraffic(): Promise<void> {
  const upload = (forwardedFor: string) =>
    fetch(`${BASE_URL}/image?format=webp&quality=50`, {
      body: FIXTURE_JPEG,
      headers: { 'content-type': 'image/jpeg', 'x-forwarded-for': forwardedFor },
      method: 'POST',
    });
  const scan = (forwardedFor: string) =>
    fetch(`${BASE_URL}/virus-scan`, {
      body: FIXTURE_JPEG,
      headers: { 'content-type': 'image/jpeg', 'x-forwarded-for': forwardedFor },
      method: 'POST',
    });

  const steps: Array<{ label: string; run: () => Promise<Response>; status: number }> = [
    { label: 'upload 203.0.113.7 (miss)', run: async () => upload('203.0.113.7'), status: 201 },
    { label: 'upload 203.0.113.7 (cache hit)', run: async () => upload('203.0.113.7'), status: 201 },
    { label: 'upload 198.51.100.42', run: async () => upload('198.51.100.42'), status: 201 },
    { label: 'upload 192.0.2.23', run: async () => upload('192.0.2.23'), status: 201 },
    { label: 'upload 127.0.0.1', run: async () => upload('127.0.0.1'), status: 201 },
    { label: 'virus-scan 203.0.113.7', run: async () => scan('203.0.113.7'), status: 201 },
    { label: 'virus-scan 127.0.0.1', run: async () => scan('127.0.0.1'), status: 201 },
  ];

  // The cache-hit step must land after its twin, hence sequential, not parallel.
  for (const step of steps) {
    const response = await step.run();
    if (response.status !== step.status) {
      const body = await response.text();
      throw new Error(`seed failed (${step.label}): HTTP ${String(response.status)} ${body}`);
    }
    // Drain the body so the connection closes promptly.
    await response.arrayBuffer();
  }
}

/**
 * Stops the backend gracefully (SIGTERM) and force-kills it if it lingers.
 * @param backend - The spawned backend process.
 */
async function stopBackend(backend: ReturnType<typeof spawn>): Promise<void> {
  if (backend.exitCode !== null || backend.signalCode !== null) return;
  backend.kill('SIGTERM');
  const exited = await Promise.race([
    new Promise<boolean>((resolve) => {
      backend.once('exit', () => {
        resolve(true);
      });
    }),
    new Promise<boolean>((resolve) => {
      setTimeout(() => {
        resolve(false);
      }, 10_000);
    }),
  ]);
  if (!exited) backend.kill('SIGKILL');
}

/**
 * Polls `/health` until it answers 200, the backend exits early, or the boot
 * deadline passes. Backend logs are included in the error to keep CI debuggable.
 * @param backend - The spawned backend process.
 * @param logs - Snapshot of the captured stdout/stderr.
 */
async function waitForHealth(
  backend: ReturnType<typeof spawn>,
  logs: () => string,
): Promise<void> {
  const deadline = Date.now() + BOOT_TIMEOUT_MS;
  let lastError: unknown;
  for (;;) {
    if (backend.exitCode !== null || backend.signalCode !== null) {
      throw new Error(
        `backend exited before /health answered (code ${String(backend.exitCode)}).\n${logs()}`,
      );
    }
    try {
      const response = await fetch(`${BASE_URL}/health`);
      if (response.ok) return;
      lastError = new Error(`GET /health -> HTTP ${String(response.status)}`);
    } catch (error: unknown) {
      // Connection refused while the app is still binding; keep polling and
      // report the last failure if we run out of time.
      lastError = error;
    }
    if (Date.now() > deadline) {
      const detail = lastError instanceof Error ? lastError.message : String(lastError);
      throw new Error(
        `backend did not answer /health within ${String(BOOT_TIMEOUT_MS)}ms (last error: ${detail}).\n${logs()}`,
      );
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 250);
    });
  }
}
