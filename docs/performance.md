# Performance and memory testing

Opt-in suites for measuring hot paths and catching retained-memory regressions.
Neither runs in `npm run check`: they are only comparable on an otherwise idle
machine, and memory assertions are deliberately loose.

## Suites

| Suite | Command | Files | Purpose |
|---|---|---|---|
| Benchmarks | `npm run test:perf` | `test/perf/*.bench.ts` | `vitest bench` (tinybench v2) micro-benchmarks of pure/streaming utilities |
| Memory | `npm run test:mem` | `test/mem/*.spec.ts` | `--expose-gc` regression specs asserting heap/arrayBuffer deltas |

## Benchmarks (`test/perf/`)

`vitest bench` runs only files matched by `benchmark.include` in
`vitest.config.perf.ts`. Results are reported as `hz`, `min`, `max`, `mean`,
`p75/p99/p995/p999`, `rme` (relative margin of error) and `samples`.

Rules that keep the suite honest:

- **Never gate CI on absolute times.** A fixed "ms < budget" fails on a loaded
  runner with zero code change. Compare runs instead:
  ```sh
  npx vitest bench --run --config vitest.config.perf.ts --outputJson test/results/bench.json
  npx vitest bench --run --config vitest.config.perf.ts --compare test/results/bench.json
  ```
  `--compare` prints a side-by-side table; v4 has no threshold or fail-on-
  regression option, so treat any regression > `max(10%, 3× combined rme)` as
  suspicious and investigate, and never fail a build on a single run.
- Consume every benchmark result (write it to a variable and inspect it):
  unconsumed values let the engine dead-code-eliminate the measured code.
- Pass `throws: true` in bench options so an exception in the measured
  function fails the benchmark instead of being swallowed.
- Keep `fileParallelism: false` and stay on an idle machine; background noise
  shows up as higher `rme`. If `rme` exceeds ~5%, re-run before trusting numbers.
- Baselines are **local**: write JSON output under `test/results/` (gitignored)
  and never commit it. If a stable regression gate is wanted later, generate a
  baseline on a dedicated runner first.

Current targets (all stream/buffer-shaped hot paths, small fixtures):

- `bufferStream` — 2 MiB synthetic upload (`src/utils/buffer.ts`)
- `drainStream` — 4 MiB discarded media (`src/utils/drain.ts`)
- `generateCacheKey` — upload/download cache keys (`src/utils/cache.ts`)
- `PDQ.hash` — 64×64 synthetic RGB frame (`src/utils/pdq.ts`)

## Memory regression specs (`test/mem/`)

`vitest.config.mem.ts` runs with `--expose-gc`, serial, no coverage
(`fileParallelism: false`, `test/mem/**` excluded from the unit config).

Patterns the specs follow, because the naive variants flake:

- Warm up first (JIT/inline caches), then measure — never fold warmup into the
  measured loop.
- `settleHeap()` before `before` and `after` readings: a few `setImmediate`s
  plus repeated `global.gc?.()`. A single `gc()` followed by an immediate read
  measures floating garbage, not a leak.
- Assert **deltas with slack** (`after - before < 4 MiB` for `heapUsed`,
  `< 8 MiB` for `arrayBuffers`). Never assert exact zero; V8 retains small
  pools by design.
- Track `arrayBuffers`/`external`, not just `heapUsed`: `sharp`, `node-av` and
  `Buffer` payloads are native memory invisible to `heapUsed`.
- Assert the functional contract too (e.g. `source.readableEnded`), so the spec
  still verifies behavior when memory is fine.

Per-worker heaps: `process.memoryUsage()` inside a test only sees the current
thread. `WorkerService` workers keep their heaps invisible to the test file;
watch `rss`, or measure inside the worker and `postMessage` the counters out.

## Fixtures

Prefer sub-1 MiB assets so specs stay fast and hermetic:
`assets/audios/audio-2.mp3` (192 KB), `assets/audios/audio-7.mp3` (314 KB),
`assets/images/image-9.jpg` (783 KB). The e2e suite stages
`test/results/fixtures/` (`audio-0.mp3`, `video-0.mp4`, `photo.jpg`,
`text.png`); reuse those patterns for future endpoint-level smoke tests rather
than reading `assets/` at runtime.

## When you need more

- Process-level diagnosis: `node --cpu-prof` / `--heap-prof` via
  `execArgv` in a temporary config, then open the profile in Speedscope or
  Chrome DevTools. `--prof` does not work with `pool: 'threads'`.
- HTTP endpoint smoke under load: `autocannon` (Node-native, scriptable
  pass/fail) against a `bootApp()` server; `k6` only for staged/soak runs.
  Neither is wired up yet.
