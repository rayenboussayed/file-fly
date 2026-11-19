# Changelog

All notable changes to file-fly are documented here. The project has **no
tagged releases yet** (`package.json` version `0.0.1`); dates are UTC and taken
from the commit history (2026-10-31 .. 2026-11-19).

## Unreleased

### Added

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

### Changed

- Repository restructured into an npm workspaces monorepo:
  `packages/backend` (NestJS 12 + Fastify) and `packages/dashboard`
  (`81edcb1`); docker serves the dashboard from the backend image (`d2e1b9e`).
- Global coverage gate dropped from 100% to 95/94/95/95 with documented
  uncovered arms; backfilled to 97.73/94.19/95.54/98.27 (`1bb5a63` and the
  backfill series `418ed12`..`7550b16`).
- Logging replacement: Nest logger fully removed in favor of pino (`3235609`).
- mdaics docs build; `.mdaicscache` tracked in the repository (by request).

### Fixed

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
