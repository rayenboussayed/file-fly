# Changelog

All notable changes to file-fly are documented here. The project has **no
tagged releases yet** (`package.json` version `0.0.1`); dates are UTC and taken
from the commit history (2026-10-31 .. 2026-11-25).

## Unreleased

### Added
- `GET|POST /video/audio` extracts the audio stream from an uploaded video using the existing node-av audio pipeline, streams the encoded result, and defaults to mp3 output. Query options mirror the audio processor except for codec and trim.

- Media streaming pipeline: image/audio/video resources processed in worker
  threads with `jutilities` stream cache, streaming input (`0d9dd18`,
  `9e5f68d`, `6461147`, `51f023c`, `c1912e4`).
- Automatic audio/video input-format detection and generated Zod AV-format
  schemas (`0d9dd18`, `c7d6a97`, `ac582b9`).
- DNA fingerprinting — PDQ for images and Chromaprint for audio — plus
  screenshot capture, OCR (`tesseract.js`, merged into `/image/ocr`) and OCR
  text extraction (`59c67ed`, `0b1eda2`, `a3daab8`).
- ClamAV virus scanning pre-parse on upload routes and a `/virus-scan`
  endpoint (`087c7db`); ClamAV byte caps applied at the stream layer
  (`CLAMAV_MAX_BYTES`, 413 on declared oversize).
- Dashboard and metrics: per-IP/per-route counters persisted in `node:sqlite`,
  metrics interceptor, `/metrics` endpoint, and a React 19 + Vite dashboard SPA
  served by the backend image (`684ab95`, `4323514`, `d2e1b9e`); CORS parsing
  for comma-separated `CORS_ORIGIN` (`c1423fb`).
- Document family endpoints: `/csv`, `/xlsx`, `/docx`, `/pptx`, `/pdf`
  (build/extract/metadata), `/font` (metadata/extract/shape/subset), `/model`
  (metadata/extract/optimize/convert) with zod-validated JSON builds,
  signature-gated binary routes and ClamAV scanning (`7924fe7`..`1b8f6b7`);
  shared OOXML reader and guards (`dfe1c14`); full e2e coverage (129/129).
- `nestjs-pino` structured logging with `LOG_LEVEL` (`e1aa385`, `3235609`,
  `f0a2c04`).
- mdaics-generated API documentation site, committed; `npm run docs` and
  `docs/documents.md` deep-dive (`37bc335`, `e6ac120`); in-process production
  smoke of the built images; static Docker audit (no daemon available).
- Dashboard screenshot e2e (`packages/dashboard/test/e2e/`): headless Playwright
  boots the built backend with a throwaway metrics store and a port of the fake
  clamd (port 33332), seeds demo traffic from documentation-range IPs via
  `X-Forwarded-For`, and rewrites the committed screenshots
  `docs/screenshots/dashboard-overview.png` and `dashboard-ip-detail.png`.
  Runs via `npm run test:e2e -w file-fly-dashboard`; deliberately excluded
  from `npm run check` (screenshots are refreshed and committed intentionally).
- Basic auth perimeter (`src/basic-auth.ts`): the implementation now delegates
  to `nest-basic-auth@1.0.0`, running as a guard inside the Fastify
  `onRequest` hook. Engages only when both `AUTH_USERNAME` and
  `AUTH_PASSWORD` are set (either alone fails boot). When enabled, every route
  except `/health` requires the pair as `x-auth-username` /
  `x-auth-password` headers, re-sent on every request — the standard
  `Authorization` header is never honored. `AUTH_NAME`, `AUTH_PASS` and
  `AUTH_REALM` are scrubbed before the package loads. Digests are compared
  with `timingSafeEqual`; the perimeter is a fastify `onRequest` hook, ahead
  of body parsing. The one deliberate contract change: `401` responses now
  carry `WWW-Authenticate: Basic realm="file-fly"` (bodies keep the two
  shapes, missing pair vs wrong pair). Shared edge wiring now lives in
  `src/bootstrap.ts` (`configureFastify`), used by both `main.ts` and the e2e
  harness. See README → Authentication.
- OpenTelemetry bridge (opt-in): `src/app.tracing.ts` starts a `NodeSDK`
  (auto-instrumentations incl. http/nestjs-core/pino/undici +
  `@fastify/otel` with `/health` ignored) **before** NestFactory when
  `OTEL_TRACE_EXPORTER_URL` (or `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT`) is set;
  the SDK is never constructed otherwise. Host metrics flow to a Prometheus
  exporter on `OTEL_METRICS_PORT` (default 9464; the conventional 8888 default
  collided with the reference setup) via `nestjs-otel`'s `OpenTelemetryModule`
  (`hostMetrics`). `/metrics` (JSON, dashboard) is unchanged and separate.
  The dashboard gained a gated browser tracer (`src/telemetry.ts`,
  `WebTracerProvider` + W3C propagation, prod builds with
  `VITE_OTEL_OTLP_ENDPOINT` only).

### Changed

- Linting now delegates to the pinned `@stackrb/eslint-config@0.1.0` (targets `node` and `react`): Playwright rules are scoped to the dashboard e2e suite so Vitest specs use Vitest rules only; `eslint-plugin-unicorn`'s `unopinionated` preset is layered on for correctness rules; the dashboard keeps two scoped exceptions (`n/no-unsupported-features/node-builtins` off for browser APIs, and `unicorn/filename-case` accepting both kebab-case and PascalCase). The gate stays `eslint . --fix --cache --max-warnings=0` with zero warnings; generated docs, test results and the generated router file stay ignored.
- Second deep refactoring pass: document-family worker entries share one
  standalone-exit guard
  (`ee38781`, `30ca6bc`); the auth header pair has one constant source shared by
  the basic-auth perimeter, CORS and log redaction (`7945e2c`); both dashboard
  pages poll through one `useMetricsQuery` hook (`ce676ac`). Generated API docs
  were regenerated. The metrics contract and its query plans are unchanged.
- Deep refactoring pass across backend, dashboard, tooling and docs
  (`ed6002d`, `9c4daa5`, `bd80ffd`, `e426ce2`, `c2651fb`, `99ffc47`,
  `22fd40f`). Shared worker-exit, byte-cap and JSON-buffer helpers replace
  repeated copies; the egress guard decodes IPv4-mapped, IPv4-compatible and
  well-known NAT64 literals; auth headers join pino redaction, `.env.*` is ignored except
  the example, and production CORS has an explicit request-header allowlist.
  The dashboard validates `/metrics` with a local zod schema and shares one
  error-state component. Three request-agnostic services move into one global
  module and composed decorators replace 25 interceptor annotations. Metrics
  rollups gain idempotent indexes, and the janitor leaves the live undici
  cache store alone. Reviews kept `WorkerService` per feature: its concurrency
  budget is mutable state. The buffer-cap performance detour is recorded in
  `docs/performance.md`.
- Repository restructured into an npm workspaces monorepo:
  `packages/backend` (NestJS 12 + Fastify) and `packages/dashboard`
  (`81edcb1`); docker serves the dashboard from the backend image (`d2e1b9e`).
- Global coverage gate dropped from 100% to 95/94/95/95 with documented
  uncovered arms; backfilled to 97.73/94.19/95.54/98.27 (`1bb5a63` and the
  backfill series `418ed12`..`7550b16`).
- Logging replacement: Nest logger fully removed in favor of pino (`3235609`).
- mdaics docs build; `.mdaicscache` tracked in the repository (by request).

### Fixed

- Dashboard rendered with no component styles at all: `@astryxdesign/core/astryx.css`
  was never imported (only `reset.css` + the neutral theme). Imported in
  `packages/dashboard/src/main.tsx`; caught by the new screenshot e2e.
- WebM output kept legal — forced Opus audio, dropped dead block
  (`3924408`).
- Boot-blocking production bug: bare or comma-separated `CORS_ORIGIN` now
  parses; unset in production yields `origin: false` (`c1423fb`).
- Correct monorepo tooling attribution and nested test-result ignores
  (`e3beba5`, `bc7c68e`).
- Final adversarial review round: egress allowlist for `source=` downloads
  (`EGRESS_ALLOWLIST`), worker-thread semaphore, env allowlist for workers,
  `image-size` pinned via override, xlsx DDE/pipe payload refusal generalized
  (`a977427`).
- Pre-commit hook: redundant `npm audit --omit=dev --fix` step dropped
  (`04aa1b4`).

### Removed

- Nest's built-in logger (replaced by nestjs-pino).
- Generated cache artifacts from the tree (`98de9b9`, `841fe4c`).

## 0.0.1 - 2026-10-31

Initial commit (`bf11c36`) — NestJS application scaffold with basic media
capabilities.
