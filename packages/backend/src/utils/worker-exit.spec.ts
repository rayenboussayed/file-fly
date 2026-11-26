import { afterEach, describe, expect, it, vi } from 'vitest';

import { exitWorker, standaloneExit } from './worker-exit.js';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  process.exitCode = 0;
});

describe('exitWorker', () => {

  it('sets the exit code, drops stdin, and exits after the unref backstop', () => {
    const destroy = vi.spyOn(process.stdin, 'destroy').mockReturnValue(process.stdin);
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`exit ${code}`);
    });
    vi.useFakeTimers();

    exitWorker(1);

    expect(process.exitCode).toBe(1);
    expect(destroy).toHaveBeenCalledOnce();
    expect(() => vi.advanceTimersByTime(250)).toThrow('exit 1');
  });

  it('unrefs the backstop timer so it cannot hold the process open', () => {
    vi.spyOn(process.stdin, 'destroy').mockReturnValue(process.stdin);
    const unref = vi.fn();
    // setTimeout normally returns a Timeout; the helper only calls unref on it.
    vi.spyOn(globalThis, 'setTimeout').mockReturnValue(
      { unref } as unknown as NodeJS.Timeout,
    );

    exitWorker(0);

    expect(unref).toHaveBeenCalledOnce();
  });
});

describe('standaloneExit', () => {

  it('is a no-op when FILE_FLY_WORKER is not set', () => {
    vi.stubEnv('FILE_FLY_WORKER', undefined);
    const destroy = vi.spyOn(process.stdin, 'destroy');
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`exit ${String(code)}`);
    });

    standaloneExit(0);

    expect(destroy).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(0);
  });

  it('exits when FILE_FLY_WORKER is set to 1', () => {
    vi.stubEnv('FILE_FLY_WORKER', '1');
    const destroy = vi.spyOn(process.stdin, 'destroy').mockReturnValue(process.stdin);
    vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`exit ${code}`);
    });
    vi.useFakeTimers();

    standaloneExit(2);

    expect(process.exitCode).toBe(2);
    expect(destroy).toHaveBeenCalledOnce();
  });
});

/**
Named symbol for the mdaics docs site (see https://github.com/rayenboussayed/mdaics); no runtime use.
 */
export const WORKER_EXIT_API_SURFACE = 'Unit coverage for the worker exit helper.';
