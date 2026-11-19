# AGENTS.md

## Commands
- Verify whole project: `npm run check`
- Unit tests only: `npm run test` (both workspaces)
- E2E tests only: `npm run test:e2e`
- Coverage: `npm run test:cov`
- Lint with auto-fix: `npm run lint`; lint uses `--max-warnings=0`
- Type check: `npm run typecheck`
- Build: `npm run build`
- Dashboard dev server: `npm run dev -w file-fly-dashboard`
- Perf/memory suites (opt-in, not in `npm run check`): `npm run test:perf` (benchmarks), `npm run test:mem` (GC memory regressions); see `docs/performance.md`

## Structure
- npm-workspaces monorepo: `packages/backend` (the NestJS + Fastify media service) and `packages/dashboard` (React 19 + Vite 8 SPA: Astryx + TanStack Router/Query/Charts). Root orchestrates; `packages/backend` docs apply to its subtree.
- Media endpoints under `/image`, `/audio`, `/video`, plus `/image/dna`, `/audio/dna`, `/video/dna`, `/image/ocr` (tesseract.js text extraction; JSON payload), and root `/signature`, `/virus-scan` (both `GET|POST`; JSON; `POST` answers 201).
- Document-family endpoints (all `POST`, answer 201): `/csv/{build,extract,metadata}`, `/xlsx/{build,extract,metadata}`, `/docx/{build,extract,metadata}`, `/pptx/{build,extract,metadata}`, `/pdf/{build,extract,metadata}`, `/font/{metadata,extract,shape,subset}`, `/model/{metadata,extract,optimize,convert}`. Build routes take strict zod-validated JSON; binary routes are signature-gated and ClamAV-scanned. See `docs/documents.md`.
- Metrics: `packages/backend/src/metrics/` (store, interceptor, controller, module) — per-IP counters persisted in `node:sqlite` (hourly per-route + daily per-IP counters, hourly latency histogram). `DashboardStaticService` serves the prebuilt SPA at `/` when `DASHBOARD_DIR` contains an `index.html` (`/` and `/ip/:ip` aliased to it); API routes are never shadowed; Nest's 404 handler is untouched.
- Media streams enter through three interceptors, bound in this order: `ClsInterceptor` (global) → `MetricsInterceptor` (global; in-flight gauge, bytes in/out, files in/out, cache outcome, scan verdicts; excludes `/metrics` and `/health`) → `FileScannerInterceptor` (ClamAV scan before routing; infected → 422) then `FileParserInterceptor` (signature probe → cache key). Sources enter via `WorkerService` for the media pipeline, `bufferStream` for OCR. Feature modules each provide their own `AntiVirusService` — see `docs/antivirus.md`.
- PDQ/Chromaprint fingerprints are computed via `pdq-wasm` loaded through `createRequire` CJS (ESM entry broken under Node) and node-av's `chromaprint` muxer (`algorithm: 1`); see `docs/dna.md`.
- Heavy media work runs in workers (`packages/backend/src/resources/*/worker/index.ts`, helpers in sibling files) — same for document/model builds (`docx`, `pptx`, `pdf`, `model/optimize`); OCR runs in-process via sharp + a tesseract.js worker pool — see `docs/ocr.md`.
- Media output cache: filesystem-backed `StreamCache` from jutilities (atomic tmp→rename writes, 0o600, TTL via `CACHE_TTL_MS`, keys are sha256 of the NUL-joined `baseKey`/`filename`/`workerData`); size-0 entries count as a miss and failed workers' entries are unlinked. The `CacheJanitorService` enforces TTL and the `CACHE_MAX_BYTES` LRU cap over `CACHE_DIR`. See `packages/backend/src/services/worker.service.ts`.
- `node_modules/node-av` is the media backend.
- Generated format enums live in `packages/backend/src/constants/av-formats.ts`; regenerate with `npm run script:union-to-enum`. Do not edit manually.

## Lint rule policy
- Do not disable ESLint rules globally.
- If a rule genuinely conflicts with code, disable it only inline on the exact line or immediately above it, with a reason comment.
- `npm run lint` must finish with zero errors and zero warnings.

## Code style / TypeScript
- Strict TypeScript is enabled; the alias `@/*` points to `src`.
- Avoid `any` and `as` unless unavoidable; justify with a comment.
- Keep cache and worker behavior end-to-end streaming; no full buffering.

## Environment
- Cache and worker behavior are controlled by `CACHE_DIR`, `CACHE_TTL_MS`, `CACHE_MAX_BYTES`, `CACHE_SWEEP_INTERVAL_MS`, and `CACHE_TMP_MAX_AGE_MS`.
- Metrics behavior is controlled by `METRICS_DIR`, `METRICS_TOKEN`, `METRICS_RETENTION_DAYS`, and `METRICS_FLUSH_INTERVAL_MS`; the SPA static root is `DASHBOARD_DIR`; `TRUST_PROXY=true` honors `X-Forwarded-For` for `request.ip` (set only behind a proxy you control).
- OCR/tesseract behavior is controlled by `TESSERACT_DIR` (defaults to `<CACHE_DIR>/tesseract`), `TESSERACT_POOL_SIZE`, `TESSERACT_PRELOAD`, `TESSERACT_RECYCLE_JOBS`, and `TESSERACT_TIMEOUT_MS`.
- `NODE_ENV` must be `development` or `production`; production enables restrictive security headers / CSRF.
- `CORS_ORIGIN` in production is a comma-separated list of allowed origins (URLs); a single bare URL is accepted as a one-element list.
- `LOG_LEVEL` sets the pino log level (`fatal`/`error`/`warn`/`info`/`debug`/`trace`); unset means `info` in production, `debug` otherwise; invalid values reject boot.

## Testing
- Unit specs match `**/*.spec.ts` (dashboard uses `**/*.spec.{ts,tsx}`); E2E specs match `**/*.e2e-spec.ts`. Benchmark files match `packages/backend/test/perf/*.bench.ts`; memory specs live in `packages/backend/test/mem/*.spec.ts` and are excluded from the unit config.
- Do not run tests in parallel; `fileParallelism: false`.
- Real worker smoke tests use files under `packages/backend/assets/`.
- Store generated test output under `packages/backend/test/results`.
- Cache writes go to `CACHE_DIR`; test cleanup should avoid polluting production `cache/`.