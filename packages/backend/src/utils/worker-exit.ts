/**
 * Ends a worker process after its job finishes. Dropping stdin lets the event
 * loop drain on its own; the timer is a backstop for native media handles that
 * outlive the drain. The timer is unref'd, so it never holds the process open.
 * @param code - Exit code for the worker process.
 */
export function exitWorker(code: number): void {
  process.exitCode = code;
  process.stdin.destroy();
  // Native media handles can keep the worker alive past stdin's drain; this
  // unref'd backstop is the bounded way to end that process. Resolve the
  // routine at call time so injected spies still observe the forced exit.
  const forceExit = process.exit.bind(process);
  setTimeout(() => forceExit(code), 250).unref();
}

/**
 * Exits the worker thread when it is running standalone; a no-op otherwise.
 * The guard reads `FILE_FLY_WORKER` at call time: WorkerService sets it to
 * "1" before spawning, while unit specs import the module in-process with the
 * variable unset.
 * @param code - Exit code for the worker process.
 */
export function standaloneExit(code: number): void {
  if (process.env.FILE_FLY_WORKER !== '1') return;
  exitWorker(code);
}

