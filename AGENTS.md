# AGENTS.md

## Commands
- Verify whole project: `npm run check`
- Unit tests only: `npm run test`
- E2E tests only: `npm run test:e2e`
- Coverage: `npm run test:cov`
- Lint with auto-fix: `npm run lint`; lint uses `--max-warnings=0`
- Type check: `npm run typecheck`
- Build: `npm run build`
- Perf/memory suites (opt-in, not in `npm run check`): `npm run test:perf` (benchmarks), `npm run test:mem` (GC memory regressions); see `docs/performance.md`

## Structure
- NestJS app; media endpoints under `/image`, `/audio`, `/video`, plus `/image/dna`, `/audio/dna`, `/video/dna`, and `/image/ocr` (tesseract.js text extraction; JSON payload).
- Uploaded/downloaded media streams enter through `FileParserInterceptor` — `WorkerService` for the media pipeline, `bufferStream` for buffering OCR input.
- PDQ/Chromaprint fingerprints are computed via `pdq-wasm` loaded through `createRequire` CJS (ESM entry broken under Node) and node-av's `chromaprint` muxer (`algorithm: 1`); see `docs/dna.md`.
- Heavy media work runs in workers (`src/resources/*/worker/index.ts`, helpers in sibling files); OCR runs in-process via sharp + a tesseract.js worker pool — see `docs/ocr.md`.
- Media output cache: filesystem-backed `StreamCache` from jutilities (atomic tmp→rename writes, 0o600, TTL via `CACHE_TTL_MS`, keys are sha256 of the NUL-joined `baseKey`/`filename`/`workerData`); size-0 entries count as a miss and failed workers' entries are unlinked. The `CacheJanitorService` enforces TTL and the `CACHE_MAX_BYTES` LRU cap over `CACHE_DIR`. See `src/services/worker.service.ts`.
- `node_modules/node-av` is the media backend.
- Generated format enums live in `src/constants/av-formats.ts`; regenerate with `npm run script:union-to-enum`. Do not edit manually.

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
- OCR/tesseract behavior is controlled by `TESSERACT_DIR` (defaults to `<CACHE_DIR>/tesseract`), `TESSERACT_POOL_SIZE`, `TESSERACT_PRELOAD`, `TESSERACT_RECYCLE_JOBS`, and `TESSERACT_TIMEOUT_MS`.
- `NODE_ENV` must be `development` or `production`; production enables restrictive security headers / CSRF.

## Testing
- Unit specs match `**/*.spec.ts`; E2E specs match `**/*.e2e-spec.ts`. Benchmark files match `test/perf/*.bench.ts`; memory specs live in `test/mem/*.spec.ts` and are excluded from the unit config.
- Do not run tests in parallel; `fileParallelism: false`.
- Real worker smoke tests use files under `assets/`.
- Store generated test output under `test/results`.
- Cache writes go to `CACHE_DIR`; test cleanup should avoid polluting production `cache/`.