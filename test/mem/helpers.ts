/**
 * Shared helper for the memory-regression specs.
 *
 * The suite runs under `vitest.config.mem.ts` with `--expose-gc`, which makes
 * `globalThis.gc` available. The guard keeps the spec files runnable (and
 * obviously broken) outside that config instead of crashing on a missing flag.
 */

/**
 * Forces a full GC cycle and idles the event loop long enough for V8 to sweep.
 * @returns Resolves once the heap has had a chance to settle.
 */
export async function settleHeap(): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    globalThis.gc?.();
  }
}
