/**
 * Ends a worker process after its job finishes. Dropping stdin lets the event
 * loop drain on its own; the timer is a backstop for native media handles that
 * outlive the drain. The timer is unref'd, so it never holds the process open.
 * @param code - Exit code for the worker process.
 */
export function exitWorker(code: number): void {
  process.exitCode = code;
  process.stdin.destroy();
  // eslint-disable-next-line n/no-process-exit -- native media handles can keep the worker alive; this is the bounded backstop.
  setTimeout(() => process.exit(code), 250).unref();
}

/**
 * Ends a standalone worker process after its job finishes; a no-op when the
 * worker runs inside WorkerService (unit specs import the module in-process).
 * @param code - Exit code for the worker process.
 */
export function standaloneExit(code: number): void {
  if (process.env.FILE_FLY_WORKER !== '1') return;
  exitWorker(code);
}

