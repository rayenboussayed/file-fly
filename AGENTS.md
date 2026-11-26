# AGENTS.md

Guidance for agents working in this repo. Verify claims against the executable
sources (`package.json`, configs, `src/`) when in doubt.

## Commands

- Whole project: `npm run check` — build → typecheck → lint → `test:full` (backend unit + e2e, dashboard specs) → knip. This is the definition of done.
- Unit tests only: `npm run test`. E2E only: `npm run test:e2e` — note the backend e2e script runs `npm run build` first, so `dist/` is always rebuilt before e2e. At the root, `test:e2e` fans out to both workspaces.
- Dashboard screenshot e2e: `npm run test:e2e -w file-fly-dashboard` — rebuilds backend + SPA, boots the built backend with a fake clamd and a throwaway metrics store, seeds demo traffic from synthetic IPs, screenshots the SPA into `docs/screenshots/` (committed; regenerate deliberately). Not part of `npm run check` or the hook.
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

- `AUTH_USERNAME` / `AUTH_PASSWORD` — basic-auth perimeter (`src/basic-auth.ts`), now delegating to `nest-basic-auth@1.0.0` (the guard runs inside the Fastify `onRequest` hook). **Both or neither** — setting just one fails boot. When both are set, every route except `/health` requires the pair as plain `x-auth-username` / `x-auth-password` headers, re-sent on every request; the standard `Authorization` header is never honored. `AUTH_NAME`, `AUTH_PASS` and `AUTH_REALM` are scrubbed from the environment before the package loads, so only the configured pair is authoritative. Unset ⇒ perimeter disabled entirely. Credentials are compared via SHA-256 digests with `timingSafeEqual`. The perimeter runs as a fastify `onRequest` hook, ahead of body parsing (unauthenticated uploads are rejected before ClamAV/workers). `401` responses now carry `WWW-Authenticate: Basic realm="file-fly"` (the one deliberate contract change); bodies keep the two shapes (missing pair vs wrong pair). Docker `HEALTHCHECK` hits `/health` and needs no credentials. Browsers cannot set custom headers on navigation, so the SPA and `/swagger` need a proxy that injects the pair — see README → Authentication.
- `OTEL_TRACE_EXPORTER_URL` (fallback `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`) / `OTEL_METRICS_PORT` — OpenTelemetry bridge. Unless an endpoint is set, the SDK is **never constructed** (no port bound, no spans anywhere; unit/e2e boots stay dark). Traces: W3C+B3+baggage, batched OTLP/HTTP, `@fastify/otel` (per-request + lifecycle spans, `/health` ignored) and Node auto-instrumentations (http, nestjs-core, pino trace-id injection, undici). Host metrics: Prometheus exporter on `:9464` (bound only when enabled; independent of the JSON `/metrics` feed). `main.ts` starts the SDK before NestFactory; `OtelShutdownService` in `app.module.ts` flushes on Nest's SIGTERM hook. The dashboard has its own browser tracer (`packages/dashboard/src/telemetry.ts`, `WebTracerProvider`), active only in prod builds with `VITE_OTEL_OTLP_ENDPOINT` set. Worker threads are opaque to OTel.
- `CACHE_DIR`, `CACHE_TTL_MS`, `CACHE_MAX_BYTES`, `CACHE_SWEEP_INTERVAL_MS`, `CACHE_TMP_MAX_AGE_MS` — output cache.
- `METRICS_DIR`, `METRICS_TOKEN`, `METRICS_RETENTION_DAYS`, `METRICS_FLUSH_INTERVAL_MS` — metrics store. `/metrics` needs `METRICS_TOKEN` as a bearer; in production a missing token disables the route (503); in development the route is open with a warning.
- `DASHBOARD_DIR` — SPA root; `TRUST_PROXY=true` honors `X-Forwarded-For` (only behind a proxy you control).
- `TESSERACT_DIR` (default `<CACHE_DIR>/tesseract`), `TESSERACT_POOL_SIZE`, `TESSERACT_PRELOAD`, `TESSERACT_RECYCLE_JOBS`, `TESSERACT_TIMEOUT_MS`.
- `EGRESS_ALLOWLIST` gates the `source=` download path (comma-separated bare hostnames/dotted suffixes); loopback/private/link-local/CGNAT literals are refused when unset.
- `CORS_ORIGIN` in production: comma-separated list of origins; a single bare URL is accepted. Unset in production means `origin: false`.
- `CLAMAV_HOST` / `CLAMAV_PORT` — uploads are scanned pre-parse; uploads also cap bytes at `CLAMAV_MAX_BYTES` (413 on declared oversize).

## Testing

- Units: `**/*.spec.ts` (`.tsx` on dashboard); e2e: `**/*.e2e-spec.ts`; benchmarks: `packages/backend/test/perf/*.bench.ts`; memory specs: `packages/backend/test/mem/**` (excluded from unit config; own runner).
- E2E boots the built backend; the harness (`test/global-setup.ts`) starts a fake clamd on `127.0.0.1:33331`, pins `EGRESS_ALLOWLIST=127.0.0.1`, `CLAMAV_HOST=127.0.0.1:33331` and writes under `test/results/` (gitignored). Unit-shaped worker tests and e2e must stay `fileParallelism: false`. The e2e boot shares the production edge wiring with `main.ts` (`src/bootstrap.ts → configureFastify`); a dedicated authed boot lives in `test/basic-auth.e2e-spec.ts` — it sets `AUTH_USERNAME`/`AUTH_PASSWORD` in `beforeAll` and dynamic-imports `./helpers.js` afterwards, because `environment.ts` parses at import time (static imports of helpers would freeze the perimeter off).
- The dashboard's Playwright screenshot suite (`packages/dashboard/test/e2e/`) is separate from vitest e2e: `test/e2e/global-setup.ts` starts a port of the fake clamd on `33332`, spawns the built backend as a child process with a fresh `mkdtemp` metrics/cache tree (`METRICS_FLUSH_INTERVAL_MS=50`, `TRUST_PROXY=true`), seeds ~7 requests from documentation-range IPs (203.0.113.7, 198.51.100.42, 192.0.2.23) via `X-Forwarded-For`, and chromium screenshots `/` and `/ip/203.0.113.7` into `docs/screenshots/` (committed). Needs OS Playwright deps once per machine: `npx playwright install-deps chromium` (system packages, not repo state). The SPA is a fixed-height Astryx app shell — the document never scrolls and `fullPage` screenshots clip; `shootFullHeight` resizes the viewport to the content's intrinsic height instead. `npm run test:e2e -w file-fly-dashboard` runs it; it is deliberately excluded from `npm run check` (screenshots would churn every commit). Timestamp labels (`uptime`, `updated …`) change every run — refresh screenshots intentionally and commit them with the UI change that motivated them.
- Coverage floor is 95/94/95/95 (statements/branches/functions/lines) — do not lower it and do not "fix" gaps by gaming tests. Accepted exceptions are documented in `docs/advisories.md` (xlsx@0.18.5; `image-size` override for pptxgenjs) — read it before touching dependencies.
- Real worker smoke tests use `packages/backend/assets/`. Cache writes in tests go to `CACHE_DIR`; keep them from polluting the production `cache/`.

## Conventions and gotchas

- Lint: `eslint . --fix --cache --max-warnings=0` — zero errors, zero warnings. Never disable a rule globally; inline disables need an exact line and a reason comment.
- ESLint: the root flat config delegates to the pinned `@stackrb/eslint-config@0.1.0` with targets `node` and `react`. Playwright rules are scoped to `packages/dashboard/test/e2e`, so Vitest specs use Vitest rules only. `eslint-plugin-unicorn`'s `unopinionated` preset is layered on for all code files. The dashboard keeps two scoped exceptions: `n/no-unsupported-features/node-builtins` is off (browser APIs allowed) and `unicorn/filename-case` allows both kebab-case and PascalCase. Generated docs, test results and `packages/dashboard/src/routeTree.gen.ts` stay ignored.
- The dashboard must import `@astryxdesign/core/astryx.css` (alongside `reset.css` and the theme css) — without it every page renders with no component styles (only the reset and CSS variables apply). The screenshot e2e caught this; keep the import in `packages/dashboard/src/main.tsx`.
- Commits: conventional commits; body lines ≤ 100 chars (commitlint). The pre-commit hook runs the full check — budget time for it.
- Markdown is linted too: `[bracket-shaped]` text in headings or prose is parsed as a label reference and fails `markdown/no-missing-label-refs` — avoid bracketed pseudo-labels in `.md` files (headings like `## Unreleased`, not `## [Unreleased]`).
- Strict TypeScript; alias `@/*` → `src`. Avoid `any` and unsafe `as`; justify with a comment when unavoidable. TSDoc on exports — generated API docs render from it.
- Keep the media pipeline end-to-end streaming; no full buffering (document-family binary routes buffer the capped upload, deliberately).
- `.agent-swarm/` is gitignored agent scratch — leave it alone. `docs/advisories.md` is the ledger of accepted security exceptions; update it, never bypass it.
- `.mdaicscache` at the repo root is tracked intentionally; regeneration is expected to modify it.
