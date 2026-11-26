# Performance and memory testing

Opt-in suites for measuring hot paths and catching retained-memory regressions.
Neither runs in `npm run check`: they are only comparable on an otherwise idle
machine, and memory assertions are deliberately loose.


## True Baseline vs current numbers

Machine: this container (Node 26.13.1, npm 11.20.0). Paths moved from the
repository root to `packages/backend/` in the monorepo refactor; timings were
re-measured on the moved tree. Absolute numbers move with the machine; the
before/after delta under an identical workload is the signal.

| Gate | Command | Baseline (before) | After metrics+dashboard | documents + /model pass |
|---|---|---|---|---|
| `npm run build` | builds both workspaces | green | green | green |
| `npm run lint` | `eslint . --fix --cache --max-warnings=0` | 0 warnings | 0 warnings | 0 warnings |
| `npm run typecheck` (after build) | `tsc --noEmit` | green | green | green |
| unit tests | `npm run test -w file-fly-backend` | 36 files, 104 tests | 41 files, 158 tests | 80 files, 641 tests |
| dashboard unit tests | `npm run test -w file-fly-dashboard` | — | 6 files, 30 tests |
| e2e tests | `npm run test:e2e` | 4 files, 50 tests | 6 files, 62 tests | 13 files, 129 tests |
| coverage | `npm run test:cov` | 66.7% stmts / 54.8% branch (gate 100%, still failing at that stage) | 76.5% stmts / 67.4% branch (gate 100%, still failing at that stage) | 97.73% stmts / 94.19% branch / 95.54% funcs / 98.27% lines (gate 95/94/95/95, green) |
| buffer.bench (2 MiB) | `vitest bench` | 0.7535 ms | 0.7508 ms (-0.4%) | — |
| drain.bench (4 MiB) | `vitest bench` | 0.3827 ms | 0.3629 ms (-5.2%) | — |
| cache-key.bench (upload / download) | `vitest bench` | 0.0159 / 0.0120 ms | 0.0150 / 0.0114 ms | — |
| pdq.bench (64x64) | `vitest bench` | 0.3994 ms | 0.3948 ms (-1.2%) | — |
| memory suite | `npm run test:mem` | green (3/3) | green (3/3) | green (4/4, incl. pdf-build regression) |
| knip | `npm run knip` | clean | clean | clean |
| root route latency (baseline) | `autocannon -c 25 -d 15` | ~10,315 req/s avg | not re-measured |

A later refactor routed `bufferStream` through `stream.compose(ByteCapTransform)`.
Against the task baseline of 1.4278 ms mean / 700.4 hz (`vitest bench --run
--config ./vitest.config.perf.ts test/perf/buffer.bench.ts --compare`), two
isolated runs of the compose path measured 1.60 and 1.81 ms mean; restoring the
jutilities `streamSize` generator measured 1.22 ms with the same oversize
rejection. No JSON artifacts were retained for those comparison runs; the
ratios are recorded in commit `99ffc47`. Keep the buffer path generator-based
when touching the cap.

The bench suite does not exercise `createWorker`, so per-route overhead of the
metrics interceptor is not covered by a micro-benchmark; the instrumentation
is constant-time Map increments with a 1 s flush off the request path, and the
memory suite passes unchanged. Note on `UV_THREADPOOL_SIZE`: the default
libuv pool (4) governs ancillary async I/O (fs, dns, crypto); sharp and node-av
run on their own worker threads. Raise it only based on load evidence.

## Suites

| Suite | Command | Files | Purpose |
|---|---|---|---|
| Benchmarks | `npm run test:perf` | `packages/backend/test/perf/*.bench.ts` | `vitest bench` (tinybench v2) micro-benchmarks of pure/streaming utilities |
| Memory | `npm run test:mem` | `packages/backend/test/mem/*.spec.ts` | `--expose-gc` regression specs asserting heap/arrayBuffer deltas |

## Benchmarks (`packages/backend/test/perf/`)

`vitest bench` runs only files matched by `benchmark.include` in
`vitest.config.perf.ts`. Results are reported as `hz`, `min`, `max`, `mean`,
`p75/p99/p995/p999`, `rme` (relative margin of error) and `samples`.

Rules that keep the suite honest:

- **Never gate CI on absolute times.** A fixed "ms < budget" fails on a loaded
  runner with zero code change. Compare runs instead:
  ```sh
  npx vitest bench --run --config packages/backend/vitest.config.perf.ts --outputJson test/results/bench.json
  npx vitest bench --run --config packages/backend/vitest.config.perf.ts --compare test/results/bench.json
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
- Baselines are **local**: write JSON output under `packages/backend/test/results/` (gitignored)
  and never commit it. If a stable regression gate is wanted later, generate a
  baseline on a dedicated runner first.

Current targets (all stream/buffer/document-shaped hot paths, small fixtures). Numbers
from the documents + /model pass on this machine (Node 26.13.1):

- `pdf build` — 120-paragraph document, ~58 ops/s, ~17.2 ms avg (`test/perf/pdf-build.bench.ts`)
- `docx build` (elements + `Packer.toBuffer`) — 120-paragraph document, ~96 ops/s, ~10.4 ms avg (`test/perf/docx-build.bench.ts`)
- `pptx build` — 24-slide deck, ~151 ops/s, ~6.6 ms avg (`test/perf/pptx-build.bench.ts`)

Worker-thread builds (docx/pptx/model optimize/audio/video/image) pay a one-off
worker spawn (~30–80 ms) plus the worker's own RTT, neither of which these
benches include; pdf and xlsx builders run in-process; the benches measure the
in-process builders only.

Stream/buffer targets:

- `bufferStream` — 2 MiB synthetic upload (`packages/backend/src/utils/buffer.ts`)
- `drainStream` — 4 MiB discarded media (`packages/backend/src/utils/drain.ts`)
- cache key — upload/download cache keys, inlined `djb2(superjson(...))` (`test/perf/cache-key.bench.ts`, `packages/backend/src/interceptors/file-parser.interceptor.ts`)
- `PDQ.hash` — 64×64 synthetic RGB frame (`packages/backend/src/utils/pdq.ts`)

## Memory regression specs (`packages/backend/test/mem/`)

`vitest.config.mem.ts` runs with `--expose-gc`, serial, no coverage
(`fileParallelism: false`, `packages/backend/test/mem/**` excluded from the unit config).

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
`packages/backend/assets/audios/audio-2.mp3` (192 KB), `packages/backend/assets/audios/audio-7.mp3` (314 KB),
`packages/backend/assets/images/image-9.jpg` (783 KB). The e2e suite stages
`packages/backend/test/results/fixtures/` (`audio-0.mp3`, `video-0.mp4`, `photo.jpg`,
`text.png`); reuse those patterns for future endpoint-level smoke tests rather
than reading `packages/backend/assets/` at runtime.

## When you need more

- Process-level diagnosis: `node --cpu-prof` / `--heap-prof` via
  `execArgv` in a temporary config, then open the profile in Speedscope or
  Chrome DevTools. `--prof` does not work with `pool: 'threads'`.
- HTTP endpoint smoke under load: `autocannon` (Node-native, scriptable
  pass/fail) against a `bootApp()` server; `k6` only for staged/soak runs.
  Neither is wired up yet.
