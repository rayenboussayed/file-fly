# AGENTS.md

## Commands
- Verify whole project: `npm run check`
- Unit tests only: `npm run test`
- E2E tests only: `npm run test:e2e`
- Coverage: `npm run test:cov`
- Lint with auto-fix: `npm run lint`; lint uses `--max-warnings=0`
- Type check: `npm run typecheck`
- Build: `npm run build`

## Structure
- NestJS app; media endpoints under `/image`, `/audio`, `/video`.
- Uploaded/downloaded media streams enter through `FileParserInterceptor`, then `WorkerService`.
- Heavy work runs in workers: `src/resources/*/...worker.ts`.
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
- `NODE_ENV` must be `development` or `production`; production enables restrictive security headers / CSRF.

## Testing
- Unit specs match `**/*.spec.ts`; E2E specs match `**/*.e2e-spec.ts`.
- Do not run tests in parallel; `fileParallelism: false`.
- Real worker smoke tests use files under `assets/`.
- Store generated test output under `test/results`.
- Cache writes go to `CACHE_DIR`; test cleanup should avoid polluting production `cache/`.