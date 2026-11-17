import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { environment } from '@/environment.js';

import { DashboardStaticService } from './dashboard-static.service.js';

const originalEnv = { ...environment };
const tempDirs: string[] = [];

const makeService = (instance: unknown) => {
  const host = { httpAdapter: { getInstance: () => instance } };
  return new DashboardStaticService(host as never);
};

const fakeInstance = () => {
  const calls: { options?: Record<string, unknown>; routes: { get: Array<{ handler: (request: unknown, reply: unknown) => unknown; path: string; }> } } = { routes: { get: [] } };
  const instance = {
    get: vi.fn((path: string, handler: (request: unknown, reply: unknown) => unknown) => {
      calls.routes.get.push({ handler, path });
    }),
    register: vi.fn(async (_plugin: unknown, options: Record<string, unknown>) => {
      calls.options = options;
    }),
  };
  return { calls, instance };
};

beforeEach(() => {
  Object.assign(environment, originalEnv);
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) fs.rmSync(dir, { force: true, recursive: true });
  }
});

describe('DashboardStaticService', () => {
  it('serves nothing and warns when DASHBOARD_DIR has no index.html', async () => {
    const { calls, instance } = fakeInstance();
    await makeService(instance).onApplicationBootstrap();
    expect(instance.register).not.toHaveBeenCalled();
    expect(calls.routes.get).toHaveLength(0);
  });

  it('registers exact static routes and the deep-link alias', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dashboard-'));
    tempDirs.push(dir);
    // eslint-disable-next-line security/detect-non-literal-fs-filename -- temp directory created by the test itself
    fs.writeFileSync(path.join(dir, 'index.html'), '<div id="root"></div>');
    (environment as { DASHBOARD_DIR: string }).DASHBOARD_DIR = dir;

    const { calls, instance } = fakeInstance();
    await makeService(instance).onApplicationBootstrap();

    expect(instance.register).toHaveBeenCalledTimes(1);
    expect(calls.options).toMatchObject({ index: ['index.html'], wildcard: false });
    expect(calls.options?.root).toBe(path.resolve(dir));
    expect(calls.routes.get).toHaveLength(1);
    expect(calls.routes.get[0]?.path).toBe('/ip/:ip');

    const sendFile = vi.fn(() => 'served');
    const result = calls.routes.get[0]?.handler({}, { sendFile });
    expect(sendFile).toHaveBeenCalledWith('index.html');
    expect(result).toBe('served');
  });
});
