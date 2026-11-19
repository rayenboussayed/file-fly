# AGENTS.md

Guidance for agents working in this repo. Verify claims against the executable
sources (`package.json`, configs, `src/`) when in doubt.

## Commands

- Whole project: `npm run check` — build → typecheck → lint → `test:full` (backend unit + e2e, dashboard specs) → knip. This is the definition of done.
- Unit tests only: `npm run test`. E2E only: `npm run test:e2e` — note the backend e2e script runs `npm run build` first, so `dist/` is always rebuilt before e2e.
- Backend single spec: `npx vitest run src/path/to/file.spec.ts` (from `packages/backend`). Single e2e spec: `npx vitest run --config ./vitest.config.e2e.ts test/csv.e2e-spec.ts`.
- Dashboard dev server: `npm run dev -w file-fly-dashboard`.
- Perf/memory suites (opt-in, NOT in `npm run check`): `npm run test:perf`, `npm run test:mem`; see `docs/performance.md`.
- API docs: `npm run docs` (mdaics) regenerates `packages/*/docs/*.md` — these are committed; never hand-edit them. `docs/*.md` at the repo root are hand-written and authoritative.
- There is **no CI** — all gating is the husky pre-commit hook (`npm audit fix || true; npm run check`). The hook no longer stages anything.

## Structure

- npm-workspaces monorepo: `packages/backend` (NestJS 12 + Fastify media service, entry `src/main.ts`) and `packages/dashboard` (React 19 + Vite SPA, served by the backend). Root orchestrates; `packages/backend` docs apply to its subtree.
- Media endpoints under `/image`, `/audio`, `/video`, plus `/image/dna`, `/audio/dna`, `/video/dna`, `/image/ocr` (tesseract.js; JSON payload), and root `/signature`, `/virus-scan` (both `GET|POST`; JSON; `POST` answers 201).
- Document-family endpoints (all `POST`, answer 201): `/csv`, `/xlsx`, `/docx`, `/pptx`, `/pdf` `{build,extract,metadata}`, `/font` `{metadata,extract,shape,subset}`, `/model` `{metadata,extract,optimize,convert}`. Build routes take strict zod-validated JSON; binary routes are signature-gated and ClamAV-scanned. See `docs/documents.md`.
- Metrics: `packages/backend/src/metrics/` — per-IP counters in `node:sqlite`. `DashboardStaticService` serves the prebuilt SPA at `/` when `DASHBOARD_DIR` contains an `index.html`; API routes are never shadowed.
- Streams enter through bound interceptors, in order: `ClsInterceptor` (global) → `MetricsInterceptor` (global; excludes `/metrics`, `/health`) → `FileScannerInterceptor` (ClamAV pre-parse; infected → 422) → `FileParserInterceptor` (signature probe → cache key). Media enters via `WorkerService`; OCR uses `bufferStream`.
- Heavy media work runs in workers (`packages/backend/src/resources/*/worker/index.ts`); same for document/model builds (`docx`, `pptx`, `model/optimize`). pdf/xlsx build in-process; OCR runs in-process via sharp + a tesseract.js worker pool.
- Media output cache: filesystem `StreamCache` from jutilities, atomic tmp→rename, 0o600, TTL via `CACHE_TTL_MS`, keys are sha256 of the NUL-joined `baseKey`/`filename`/`workerData`; `CacheJanitorService` enforces TTL and the `CACHE_MAX_BYTES` LRU cap.
- `node_modules/node-av` is the media backend. PDQ/Chromaprint fingerprints: `pdq-wasm` via `createRequire` (ESM entry broken) and node-av's `chromaprint` muxer (`algorithm: 1`). `src/constants/av-formats.ts` is generated — regenerate with `npm run script:union-to-enum`, never edit.

## Environment

`NODE_ENV` is `development` or `production` (anything else rejects boot). Env is zod-validated at `src/environment.ts`; invalid `LOG_LEVEL` rejects boot. `LOG_LEVEL` unset means `info` (prod) / `debug` (elsewhere).

- `CACHE_DIR`, `CACHE_TTL_MS`, `CACHE_MAX_BYTES`, `CACHE_SWEEP_INTERVAL_MS`, `CACHE_TMP_MAX_AGE_MS` — output cache.
- `METRICS_DIR`, `METRICS_TOKEN`, `METRICS_RETENTION_DAYS`, `METRICS_FLUSH_INTERVAL_MS` — metrics store. `/metrics` needs `METRICS_TOKEN` as a bearer; in production a missing token disables the route (503); in development the route is open with a warning.
- `DASHBOARD_DIR` — SPA root; `TRUST_PROXY=true` honors `X-Forwarded-For` (only behind a proxy you control).
- `TESSERACT_DIR` (default `<CACHE_DIR>/tesseract`), `TESSERACT_POOL_SIZE`, `TESSERACT_PRELOAD`, `TESSERACT_RECYCLE_JOBS`, `TESSERACT_TIMEOUT_MS`.
- `EGRESS_ALLOWLIST` gates the `source=` download path (comma-separated bare hostnames/dotted suffixes); loopback/private/link-local/CGNAT literals are refused when unset.
- `CORS_ORIGIN` in production: comma-separated list of origins; a single bare URL is accepted. Unset in production means `origin: false`.
- `CLAMAV_HOST` / `CLAMAV_PORT` — uploads are scanned pre-parse; uploads also cap bytes at `CLAMAV_MAX_BYTES` (413 on declared oversize).

## Testing

- Units: `**/*.spec.ts` (`.tsx` on dashboard); e2e: `**/*.e2e-spec.ts`; benchmarks: `packages/backend/test/perf/*.bench.ts`; memory specs: `packages/backend/test/mem/**` (excluded from unit config; own runner).
- E2E boots the built backend; the harness (`test/global-setup.ts`) starts a fake clamd on `127.0.0.1:33331`, pins `EGRESS_ALLOWLIST=127.0.0.1`, `CLAMAV_HOST=127.0.0.1:33331` and writes under `test/results/` (gitignored). Unit-shaped worker tests and e2e must stay `fileParallelism: false`.
- Coverage floor is 95/94/95/95 (statements/branches/functions/lines) — do not lower it and do not "fix" gaps by gaming tests. Accepted exceptions are documented in `docs/advisories.md` (xlsx@0.18.5; `image-size` override for pptxgenjs) — read it before touching dependencies.
- Real worker smoke tests use `packages/backend/assets/`. Cache writes in tests go to `CACHE_DIR`; keep them from polluting the production `cache/`.

## Conventions and gotchas

- Lint: `eslint . --fix --max-warnings=0` — zero errors, zero warnings. Never disable a rule globally; inline disables need an exact line and a reason comment.
- Commits: conventional commits; body lines ≤ 100 chars (commitlint). The pre-commit hook runs the full check — budget time for it.
- Markdown is linted too: `[bracket-shaped]` text in headings or prose is parsed as a label reference and fails `markdown/no-missing-label-refs` — avoid bracketed pseudo-labels in `.md` files (headings like `## Unreleased`, not `## [Unreleased]`).
- Strict TypeScript; alias `@/*` → `src`. Avoid `any` and unsafe `as`; justify with a comment when unavoidable. TSDoc on exports — generated API docs render from it.
- Keep the media pipeline end-to-end streaming; no full buffering (document-family binary routes buffer the capped upload, deliberately).
- `.agent-swarm/` is gitignored agent scratch — leave it alone. `docs/advisories.md` is the ledger of accepted security exceptions; update it, never bypass it.
- `.mdaicscache` at the repo root is tracked intentionally; regeneration is expected to modify it.
