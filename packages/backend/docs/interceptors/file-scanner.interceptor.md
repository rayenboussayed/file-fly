<a name="FileScannerInterceptor"></a>

## FileScannerInterceptor
Scans the incoming media stream for viruses before the parser runs.

Must be bound BEFORE `FileParserInterceptor` (and before any other consumer
of the source stream) so an infected upload is rejected with `422` before
the signature probe ever sees a byte of it.

CLS open-source contract: this interceptor opens the source itself through
`openMediaSource`, which is idempotent — binding it before the parser means
the parser's own open is a no-op. When the virus scanner is disabled (no
`CLAMAV_HOST`/`CLAMAV_PORT` configured) this interceptor passes media
through untouched, after logging a single warning per instance.

Failure semantics: `AntiVirusService.scan` rejects with a `413` when the
payload exceeds `CLAMAV_MAX_BYTES`, a `422` when the stream is infected,
and a `503` when clamd is unreachable or errors; those statuses are set by
the service and propagate out of this interceptor as-is. `next.handle()` is
never reached for rejected media, so no downstream interceptor or handler
runs on a failed scan.

The scan buffers the (capped) payload in memory and replaces the CLS
source with a replay `Readable`, so the pipeline downstream reads the same
bytes as if nothing happened.

**Kind**: global variable  
src: packages/backend/src/interceptors/file-scanner.interceptor.ts:39  
dist: packages/backend/dist/interceptors/file-scanner.interceptor.js:15
