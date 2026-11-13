# DNA — perceptual fingerprints

## What "DNA" means here

A DNA value is a **perceptual fingerprint**: same or similar content →
small distance; different content → large distance. It is **not** a
cryptographic hash: two byte-different files can share (near-)identical
DNA, and a tiny crafted perturbation can move the DNA far.

For exact-byte identity use the file's own content digests. This service
currently exposes **none**: the `x-file-hash` response header was removed
(2026-11-13). The `x-file-hash` *request* header is still accepted for
cache keying (see "Cache poisoning notes" below).

## Endpoints

All three media types expose DNA in both directions. No query parameters.
`POST` body is the raw media upload; `GET` takes the media from `source=`
/ file input like the other media routes.

| Method | Route | Response |
| --- | --- | --- |
| `GET`/`POST` | `/image/dna` | `{ algorithm, version, env, hash, quality }` |
| `GET`/`POST` | `/audio/dna` | `{ algorithm, version, env, hash, length }` |
| `GET`/`POST` | `/video/dna` | `{ algorithm, version, env, fps, count, frames }` |

Responses are served through the service cache (cache key includes the
`dna` op).

### `GET|POST /image/dna` — PDQ

```json
{
  "algorithm": "pdq",
  "version": "pdq@1",
  "env": { "pdqWasm": "0.3.9", "sharp": "0.35.5" },
  "hash": "<64 hex chars>",
  "quality": 100
}
```

Pipeline:

```text
sharp autoOrient → flatten #fff → removeAlpha → sRGB
  → 1024px inside resize (no enlargement, fastShrinkOnLoad: false)
  → raw RGB → PDQ (pdq-wasm CJS via createRequire)
```

PDQ match rule (upstream Meta guidance): Hamming distance **≤ 31 ≈ match**.
`quality ≤ 49` ≈ unstable hash (flat / graphic / low-detail input) —
reported, **not** enforced; treat low-quality hashes with suspicion.

### `GET|POST /audio/dna` — Chromaprint

```json
{
  "algorithm": "chromaprint",
  "version": "chromaprint@1",
  "env": { "nodeAv": "<semver>" },
  "hash": "<base64 raw fingerprint, little-endian uint32>",
  "length": 27
}
```

Pipeline:

```text
node-av Demuxer → Decoder → aformat=sample_fmts=s16
  → Encoder pcm_s16le (autoResample)
  → Muxer chromaprint with fp_format=raw, algorithm=1
```

Notes:

- `algorithm: 1` is the raw-API enum; it corresponds to fpcalc's
  "algorithm 2" footnote.
- Output is byte-identical to
  `ffmpeg -af aformat=s16 -c:a pcm_s16le -f chromaprint -algorithm 1 -fp_format raw`
  for the same input. That equivalence is a test (see Troubleshooting).
- Suggested comparison bands (upstream reference, re-measure on your
  data): BER ≤ 0.15 same recording · 0.15–0.30 review · > 0.30 different;
  require ≥ 10 s overlap.

### `GET|POST /video/dna` — frame-sequence PDQ

```json
{
  "algorithm": "vid-pdq",
  "version": "vid-pdq2fps@1",
  "env": { "nodeAv": "<semver>", "pdqWasm": "0.3.9", "sharp": "0.35.5" },
  "fps": 2,
  "count": 40,
  "frames": [{ "t": 0, "hash": "<64 hex>", "quality": 100 }]
}
```

Pipeline:

```text
node-av decode → fps=2,scale=512:-2:flags=bilinear,format=rgb24
  → per frame: packed RGB
  → sharp trim(threshold 12), kept when ≥ 64×64
  → PDQ → { t: n/2, hash, quality }
```

Notes:

- Cost is roughly superlinear in duration (decode-bound); output is
  ≈ 130 bytes/frame.
- Match: fraction of aligned frames within PDQ distance 31 (needs
  ≥ 8 samples ≈ 4 s overlap).
- A mirror copy requires mirror hashing at query time — **not
  implemented**.

### Versioning

- `version` strings (`pdq@1`, `chromaprint@1`, `vid-pdq2fps@1`) are the
  fingerprint **schema identity**.
- `env` pins the **library versions that produced the fingerprint**.
- Re-fingerprint when upgrading sharp, node-av, or pdq-wasm — vips
  decode changes alone can shift output bytes.

## Measured on this repo

Measured 2026-11-13 on Node 24.18, sharp 0.35.5, pdq-wasm 0.3.9,
node-av 6.2.0:

- **image:** 640×160 PNG-generated JPEG → distance ≤ 31 on re-encode
  (unit test); 50 MP / 11 MB JPEG request → ~1.8 s including decode,
  hash quality 100.
- **audio:** `audio-2.mp3` (6.02 s) → 108 bytes raw fingerprint
  (27 subfingerprints), byte-identical to the ffmpeg CLI reference.
- **video:** 20 s 1080p `video-0.mp4` → 40 frames at t ∈ `[0, 19.5]`,
  ~7 s wall (decode-bound).
- **e2e:** 48 tests green (`npm run test:e2e`).

## Security & operations

- **Input bounds (image):** image DNA caps uploads at 20 MiB (413) and
  decodes ≤ 100 MP. HEIC/HEIF is covered by the same cap. Animated
  GIF/WebP decode first frame only (sharp default).
- **No duration bound (audio/video):** audio/video DNA decode is
  unbounded and CPU-bound — expect ≈ 0.05–0.1 s CPU per second of media.
  Plan per-request timeouts / rate limits at the reverse proxy and cap
  file duration there. A 6 h file will run to completion.
- **Adversarially evadable by construction:** small crafted perturbations
  can move a fingerprint far. Fingerprints support dedup and triage,
  never identity proof. PDQ crops ≥ ~2–5%, pitch/tempo edits, and crops
  against frame sequences reduce matches — not guaranteed detectors.
  See arXiv 2106.09820.
- **Fingerprints leak perceptual info** (scene gist); treat as internal
  data and don't expose publicly beyond need.
- **Errors are generic 500s by design** (no internals leak); server logs
  carry absolute paths (debuggability trade-off, documented).
- **`source=` fetches are server-side GETs:** the service forwards the
  client's headers to the remote host (pre-existing behavior affecting
  ALL GET media routes) — worth an env-level egress allowlist. Do not
  call with `authorization` set unless the source is trusted.
- **Cache poisoning notes (pre-existing, M2 — documented, not fixed):**
  download-direction DNA entries key off
  `{ fileSignature, query, contentLength: 0, '' }` (stale-URL refresh
  issue); the cache-key inner digest is 32-bit DJB2; the cache stores
  fingerprints keyed by content signature (upload direction: first-64KB
  hash).
- **`x-file-hash` response header was removed** (2026-11-13); the request
  header is still accepted for cache keying.
- **Knowledge-cutoff caveat:** thresholds (PDQ 31 / BER 0.15 / fps 2 /
  512 px / 1024 px trim) are upstream-measured starting points, NOT
  calibrated on this service's corpus; re-measure before production
  matching.

## Comparison recipes

### Images (PDQ Hamming distance)

```ts
d = PDQ.hammingDistance(fromHex(a), fromHex(b));
// d ≤ 20 conservative match, d ≤ 31 permissive match (upstream guidance)
```

### Audio (Chromaprint BER over offsets)

1. Base64-decode both `hash` values to little-endian uint32 arrays.
2. For each offset in ±1200 subfingerprints, compute
   `BER = popcount(a ^ b) / bits` over the overlap.
3. Best (lowest-BER) offset wins; require ≥ 80-subfingerprint
   (≈ 10 s) overlap.
4. Bands: ≤ 0.15 same recording · 0.15–0.30 review · > 0.30 different.

### Video (frame-sequence match)

1. Slide sequence B over sequence A (1-D alignment on `t`).
2. At each shift, count sample pairs with PDQ distance ≤ 31.
3. Keep the shift with the most matches and ≥ 8 overlapping samples
   (≈ 4 s).
4. Score = matched / overlap.

## Troubleshooting

| Symptom | Meaning / action |
| --- | --- |
| `quality ≤ 49` (image/video frame) | Flat or graphic input — hash unstable. Skip or send to review. |
| `NO_AUDIO_STREAM` / `NO_VIDEO_STREAM` → 500 | Expected: the signature interceptor should already have rejected with 415. If you see the 500, check the interceptor path. |
| wasm load failure | pdq-wasm loads lazily; the service retries on the next request. A restart or first-request warmup usually clears it. |
| Suspect audio drift | Re-run the byte-identical-vs-ffmpeg check: compare the raw fingerprint bytes against `ffmpeg -af aformat=s16 -c:a pcm_s16le -f chromaprint -algorithm 1 -fp_format raw` for the same input. |
