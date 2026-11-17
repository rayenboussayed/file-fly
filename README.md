# file-fly

Stream-first file and media processing, on the fly.

`file-fly` is a [NestJS](https://nestjs.com) + [Fastify](https://fastify.dev) service (strict TypeScript, ESM) that accepts media from a raw upload (`POST`) or a remote URL (`GET ?source=…`) and streams the processed result back — never buffering whole files in memory and never writing temporary media files.

Under the hood: images are processed with [sharp](https://sharp.pixelplumbing.com/) (libvips), audio and video with [node-av](https://github.com/Brooooooklyn/node-av) (FFmpeg), perceptual fingerprints are computed in WebAssembly (PDQ) or through FFmpeg (Chromaprint), and every payload is scanned with ClamAV before it reaches the pipeline.

## Features

- **Image processing** — resize / crop / rotate / flip, blur, sharpen, median, normalize, greyscale, trim, negate, tint, format conversion via sharp. `GET|POST /image`
- **OCR** — text extraction from images with tesseract.js (bounded worker pool). `GET|POST /image/ocr`
- **Audio processing** — transcode and filter (trim, fade, gain, speed, normalize, compress, denoise) via FFmpeg. `GET|POST /audio`
- **Video processing** — transcode (h264 / vp9 / av1), scale, fps, crf, trim, denoise, deinterlace, grayscale, normalize, sharpen; frame screenshots served as `multipart/mixed`. `GET|POST /video`, `GET|POST /video/screenshot`
- **Perceptual fingerprints ("DNA")** — PDQ for images, Chromaprint for audio, frame-sequence PDQ for video. For deduplication and triage, never identity. `GET|POST /{image,audio,video}/dna`
- **Metadata & statistics** — container/stream metadata and channel-level statistics for image, audio and video. `GET|POST /{image,audio,video}/metadata`, `GET|POST /{image,audio,video}/stats`
- **Malware scanning** — every media route is scanned with ClamAV (fail-closed) before processing starts; `GET|POST /virus-scan` reports the verdict, `GET|POST /signature` reports the detected file signature.
- **Streaming output cache** — filesystem-backed, atomic `tmp → rename` writes, TTL + LRU size cap, background janitor.
- **OpenAPI** — Swagger UI at `/swagger` (JSON at `/swagger/json`).

## How it works

```text
request (raw body upload or ?source=<url> download)
  → FileScannerInterceptor   ClamAV INSTREAM scan, fail-closed
                             (infected → 422, daemon down → 503, body too big → 413)
  → FileParserInterceptor    file-type signature probe + cache key
  → signature interceptor    per-media-type checks (payload mismatch → 4xx)
  → service / worker thread  sharp or node-av pipeline
  → StreamCache              cache hit streams straight from disk
  → chunked response with backpressure
```

- No full in-memory buffering: input streams through the interceptors into worker threads; output streams back chunked with backpressure.
- No temporary media files; a crashed writer can only leave `*.tmp` files behind, which the janitor removes after `CACHE_TMP_MAX_AGE_MS`.
- Cache keys are a SHA-256 of the NUL-joined base key / filename / worker payload; entries are evicted by TTL (`CACHE_TTL_MS`) and by total size (`CACHE_MAX_BYTES`, LRU).
- Fingerprint (`/dna`) responses are served through the same cache.

## API overview

All routes accept `GET` (media fetched server-side from `?source=<url>`; client headers are forwarded to the remote host) and `POST` (raw body — set `content-length > 0` and a `content-type` supported by `file-type`, or `application/octet-stream`). `GET` answers `200`, `POST` answers `201`.

| Route | Description |
| --- | --- |
| `GET\|POST /image` | Process an image. Query: `width`, `height`, `fit`, `rotate`, `flip`, `flop`, `format`, `quality`, `blur`, `sharpen`, `median`, `normalize`, `greyscale`, `trim`, `negate`, `tint`, `background`, `withoutEnlargement`, `withoutReduction`, `threshold`, … |
| `GET\|POST /image/metadata` | sharp metadata as JSON |
| `GET\|POST /image/stats` | sharp channel statistics as JSON |
| `GET\|POST /image/ocr` | OCR text extraction. Query: `lang` — ISO 639-2 codes separated by `+` (URL-encoded, e.g. `eng%2Bfra`) or `,` (e.g. `eng,fra`); up to four codes; default `eng` |
| `GET\|POST /image/dna` | PDQ fingerprint — `{ algorithm, version, env, hash, quality }` |
| `GET\|POST /audio` | Process audio. Query: `format` (default `mp3`), `codec`, `bitrate`, `sampleRate`, `channels`, `gain`, `speed`, `fadeIn`, `fadeOut`, `trimStart`, `trimEnd`, `normalize`, `compress`, `denoise` |
| `GET\|POST /audio/metadata` | Audio stream metadata as JSON |
| `GET\|POST /audio/stats` | Audio stream statistics as JSON |
| `GET\|POST /audio/dna` | Chromaprint fingerprint — `{ algorithm, version, env, hash, length }` |
| `GET\|POST /video` | Process video. Query: `format` (default `mp4`, fragmented), `codec` (`h264`, `vp9`, `av1`), `crf`, `bitrate`, `preset`, `fps`, `width`, `height`, `rotate`, `flip`, `flop`, `trimStart`, `trimEnd`, `denoise`, `deinterlace`, `grayscale`, `normalize`, `sharpen`, `audioCodec`, `audioBitrate`, `audioNormalize`, … |
| `GET\|POST /video/screenshot` | Frame capture. Required query `frames=0,1.5,9` (up to 50, seconds) → `multipart/mixed`, one part per frame |
| `GET\|POST /video/metadata` | Video stream metadata as JSON |
| `GET\|POST /video/stats` | Video stream statistics as JSON |
| `GET\|POST /video/dna` | Frame-sequence PDQ fingerprint — `{ algorithm, version, env, fps, count, frames[] }` |
| `GET\|POST /signature` | Detected file signature — `{ ext, mime }` |
| `GET\|POST /virus-scan` | ClamAV verdict — `{ isInfected, viruses }` (answers `503` when ClamAV is not configured; infected payloads are rejected with `422` before the handler runs) |
| `GET /swagger` | Swagger UI |

## Quick start

```bash
npm install
npm run start:dev        # Nest watch mode on http://localhost:3000
```

Upload a file for processing:

```bash
# Resize + re-encode an image on the fly
curl -X POST --data-binary @photo.jpg \
     -H 'content-type: image/jpeg' \
     'http://localhost:3000/image?width=800&format=webp' \
     -o out.webp

# Transcode a video to WebM (VP9)
curl -X POST --data-binary @clip.mp4 \
     -H 'content-type: video/mp4' \
     'http://localhost:3000/video?format=webm&codec=vp9' \
     -o out.webm

# OCR an uploaded scan (English + French)
curl -X POST --data-binary @scan.png \
     -H 'content-type: image/png' \
     'http://localhost:3000/image/ocr?lang=eng%2Bfra'

# Detect the signature / scan for malware
curl -X POST --data-binary @file.bin -H 'content-type: application/octet-stream' \
     http://localhost:3000/signature
curl -X POST --data-binary @file.bin -H 'content-type: application/octet-stream' \
     http://localhost:3000/virus-scan
```

Or let the server fetch the media itself (client headers are forwarded — only use `source=` with trusted URLs):

```bash
curl 'http://localhost:3000/image?source=https%3A%2F%2Fexample.com%2Fphoto.jpg&format=webp' \
     -o out.webp
```

## Docker

Development stack (watch-mode app + ClamAV with bundled signature databases):

```bash
docker compose -f docker-compose.development.yml up --build
# app on http://localhost:3000; clamd reachable on the compose network (3310), not published
```

Production image (multi-stage, `node:24-bookworm-slim`, non-root `node` user, cache volume at `/data/cache`):

```bash
docker build -t file-fly .
docker run -p 3000:3000 -v file-fly-cache:/data/cache \
           -e NODE_ENV=production \
           -e CLAMAV_HOST=clamav -e CLAMAV_PORT=3310 \
           file-fly
```

## Configuration

All configuration is via environment variables. Values are validated with zod at boot; blank strings are treated as unset, invalid values fall back to defaults, and `NODE_ENV` must be `development` or `production`. Production enables restrictive security headers, CSRF protection and CORS (from `CORS_ORIGIN`).

| Variable | Default | Meaning |
| --- | --- | --- |
| `NODE_ENV` | — (required) | `development` or `production` |
| `PORT` | `3000` | HTTP port |
| `CORS_ORIGIN` | unset | Allowed origins in production (URLs) |
| `CACHE_DIR` | `./cache` (`/data/cache` in Docker) | Cache root; created at startup |
| `CACHE_TTL_MS` | `86400000` (24 h) | Entries unused for longer are evicted |
| `CACHE_MAX_BYTES` | `2147483648` (2 GiB) | Total cache size cap; oldest-used entries evicted first |
| `CACHE_SWEEP_INTERVAL_MS` | `600000` (10 min) | Cache janitor sweep interval |
| `CACHE_TMP_MAX_AGE_MS` | `3600000` (1 h) | Orphaned `*.tmp` files older than this are removed |
| `CLAMAV_HOST` | unset | clamd host. **Unset ⇒ virus scanning is skipped** (one warning); production deployments must set it |
| `CLAMAV_PORT` | unset | clamd port; must be set together with `CLAMAV_HOST` |
| `CLAMAV_TIMEOUT_MS` | `60000` | clamd socket connect timeout |
| `CLAMAV_MAX_BYTES` | `26214400` (25 MiB) | Larger bodies are rejected `413` before scanning |
| `TESSERACT_DIR` | `<CACHE_DIR>/tesseract` | tesseract.js language data directory |
| `TESSERACT_POOL_SIZE` | `2` | OCR worker pool size (1–8) |
| `TESSERACT_PRELOAD` | `eng` | Languages preloaded at startup |
| `TESSERACT_RECYCLE_JOBS` | `500` | Recycle an OCR worker after N jobs |
| `TESSERACT_TIMEOUT_MS` | `60000` | Per-recognition timeout |
| `FILE_HASH_HEADER_SIZE` | `65536` | Bytes hashed (SHA-512 prefix) for the upload cache key when no `x-file-hash` request header is sent |

## Testing

```bash
npm run test        # unit tests (vitest, serial)
npm run test:e2e    # build + e2e tests (fake clamd fixture)
npm run test:cov    # unit tests with coverage
npm run test:perf   # opt-in micro-benchmarks (tinybench)
npm run test:mem    # opt-in memory-regression specs (--expose-gc)
npm run check       # typecheck + lint + build + unit & e2e tests + knip
```

Unit specs match `**/*.spec.ts`; e2e specs match `**/*.e2e-spec.ts`. Test files run serially (`fileParallelism: false`); real-worker smoke tests use fixtures under `assets/`; generated output goes under `test/results/`.

## Documentation

Deep-dives live in `docs/`:

- [docs/dna.md](docs/dna.md) — perceptual fingerprints: endpoints, pipelines, comparison recipes, security notes
- [docs/ocr.md](docs/ocr.md) — OCR pipeline, query parameters, limits
- [docs/antivirus.md](docs/antivirus.md) — ClamAV integration, fail-closed behaviour, EICAR testing
- [docs/performance.md](docs/performance.md) — benchmark and memory-regression suites

## Media streaming (audio / video)

Supported output formats: `webm`, `matroska`, `mpegts`, `mp3`, `ogg`, `adts`, `flac`, and fragmented `mp4`. Plain `mp4`, `mov`, and `wav` output is rejected. Source media is streamed through node-av's demuxer, decoders, filters, encoders, and muxer, and the response uses chunked transfer encoding with backpressure.

Hard limits:

- No full input or output buffering.
- No temporary media files.
- Plain `mp4` / `mov` input with a trailing `moov` atom is rejected with a 4xx error.
- Codec/container pairings are validated before streaming.
- Worker input probing is bounded to 5MB.
- Jobs abort on client disconnect or timeout; native resources are released when FFmpeg exits.
- `UV_THREADPOOL_SIZE` should be raised when running many concurrent jobs; concurrency must be capped by the libuv thread pool.

## License

Private — the package declares `UNLICENSED` (see `package.json`).
