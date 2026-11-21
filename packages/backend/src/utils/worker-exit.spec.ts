import { afterEach, describe, expect, it, vi } from 'vitest';

import { exitWorker } from './worker-exit.js';

describe('exitWorker', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    process.exitCode = 0;
  });

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
});

/** Named symbol for the mdaics docs site (see https://github.com/rayenboussayed/mdaics); no runtime use. */
export const WORKER_EXIT_API_SURFACE = 'Unit coverage for the worker exit helper.';
