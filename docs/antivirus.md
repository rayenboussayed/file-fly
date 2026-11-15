# Virus scanning (ClamAV)

Every media request (every route bound to `FileParserInterceptor` +
`FileScannerInterceptor`, plus `/signature` and `/virus-scan` on the root
controller) is scanned with ClamAV **before** the pipeline starts. If the
payload is infected the request is rejected with `422` (`UnprocessableEntityException`)
and the workers never see the bytes.

## How it works

- `src/services/anti-virus.service.ts` — `AntiVirusService` streams a tee branch
  of the request payload to `clamd` over the clamd `INSTREAM` protocol via the
  [`clamscan`](https://www.npmjs.com/package/clamscan) package. The verdict is
  stored in CLS (`fileScan()`) for the `/virus-scan` endpoint.
- `src/interceptors/file-scanner.interceptor.ts` — `FileScannerInterceptor` runs
  the scan **before** `FileParserInterceptor`, so infected files are rejected
  before the signature probe and before any processing. Bind order everywhere is
  `@UseInterceptors(FileScannerInterceptor, FileParserInterceptor, …)`.
- The scan is streaming end-to-end: clamd scans while the body is consumed; the
  sibling tee branches (signature probe, cache key, pipeline) flow in parallel.
- Fail-closed everywhere: an inconclusive daemon verdict, an unreachable/broken
  daemon, or an aborted scan all reject the request with `503` — never a silent
  "clean". Bodies bigger than the cap never reach clamd.

## Environment

| Variable | Default | Meaning |
|---|---|---|
| `CLAMAV_HOST` | unset | Host of the clamd daemon. **Unset ⇒ scanning is skipped** (one warning at first scan). |
| `CLAMAV_PORT` | unset | Port of the clamd daemon. Must be set together with `CLAMAV_HOST`. Invalid values fail boot loudly. |
| `CLAMAV_TIMEOUT_MS` | `60000` | clamd socket connect timeout. |
| `CLAMAV_MAX_BYTES` | `26214400` (25 MiB) | Bodies larger than this are rejected with `413` *before* scanning, so clamd's `INSTREAM` size limit (`StreamMaxLength`, same default) is never hit. Raise both together for bigger files. |

When `CLAMAV_HOST`/`CLAMAV_PORT` are unset the interceptor logs
`CLAMAV_HOST/CLAMAV_PORT not set; virus scanning is disabled` once per module
and passes everything through — this is the dev/test default. **Production
deployments must set them**, otherwise uploads and downloads go through
unscanned.

## Endpoints

Both live on the root controller and accept `GET` and `POST`:

- `GET|POST /signature` — returns the file signature detected by `file-type`
  as `{ ext, mime }` (on `POST`, 201 status). `GET|POST /signature` requires a
  media source: `?source=<url>` for downloads or a raw body for uploads.
- `GET|POST /virus-scan` — returns `{ isInfected, viruses }` for the current
  payload. When the payload is infected the interceptor rejects with `422`
  first, so a `200/201` response means a clean verdict. When ClamAV is not
  configured the endpoint answers `503`.
- Infected payloads (any route bound to the scanner) get `422` with body
  `{ message: 'File is infected with: <names>', viruses: [...] }`.

## Testing with EICAR

The EICAR antivirus test file is the industry-standard payload for this.
The official signature ships in ClamAV's default databases, and the fake
clamd in `test/fake-clamd.ts` (started by `test/global-setup.ts` for e2e)
also detects it. How the EICAR fixture should be provided to the e2e suite
(repo check-in vs. generated at setup) is being discussed separately; the
dedicated `/virus-scan` e2e cases are parked until that settles.

## Docker

`docker-compose.development.yml` starts the app (watch mode) + `clamav/clamav`
(the image bundles the full signature DBs since Nov 2026 — no download
required; freshclam updates them on boot when `database.clamav.net` is
reachable, otherwise clamd keeps serving with the bundled DBs).
