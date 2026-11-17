# OCR — text extraction

Text recognition via [tesseract.js](https://github.com/naptha/tesseract.js), served
as part of the image resource. The standalone `/ocr` route was removed in favor of
`/image/ocr` (2026-11-14); `POST` returns `201`, `GET` returns `200`.

## Endpoint

| Method | Route | Response |
| --- | --- | --- |
| `GET`/`POST` | `/image/ocr` | `{ confidence, durationMs, langs, lines, text }` |

Both methods take the image either from the raw body (`POST`) or from `source=` (`GET`,
same download behavior as the other media routes). `source` must be an image (detected
by signature); non-image input is rejected with `403`, undecodable input with `415`.

### Query parameters

| Param | Type | Notes |
| --- | --- | --- |
| `source` | URL | `GET` only; ignored on uploads. |
| `lang` | string | Optional; default `eng`. ISO 639-2 codes separated by `+` or `,`, e.g. `eng+fra`, `eng,fra`. Up to four codes, deduplicated and sorted. Codes are case-insensitive. |

A raw `+` in a query string is decoded as a space by query parsers, so multi-language
URLs must either URL-encode the `+` (`lang=eng%2Bfra`) or use a comma (`lang=eng,fra`).
An invalid `lang` fails validation with `400`.

### Response

```json
{
  "confidence": 87.5,
  "durationMs": 412,
  "langs": ["eng"],
  "lines": [
    { "confidence": 87.5, "text": "The quick brown fox jumps over the lazy dog" }
  ],
  "text": "The quick brown fox jumps over the lazy dog"
}
```

- `confidence` — overall confidence, 0–100 (2 decimals).
- `durationMs` — pool acquire + recognition time, integer ms (does **not** include buffering/preprocessing).
- `langs` — normalized languages actually used.
- `lines` — per-line confidence/text, trailing newline removed per line. Words are not included by design; full words are obtainable upstream with a different `OutputFormats` call.
- `text` — full extracted text, trailing newline removed.

Limits: 20 MiB input (`413` past that — `bufferStream`'s cap), 100 MP input via sharp's
`limitInputPixels` (`415` past that / on decode failure). Language data is downloaded on
demand into `TESSERACT_DIR` (default `<CACHE_DIR>/tesseract`) and preloaded per
`TESSERACT_PRELOAD` on module startup.

## Pipeline

```text
request (raw body or source= download)
  → FileParserInterceptor (buffer, probe signature, 20 MiB cap)
  → ImageSignatureInterceptor (detected non-image → 415; undecodable signature → 403)
  → image is re-decoded in-process: auto-orient, ≤2000 px inside resize,
    greyscale, normalize, sharpen (limitInputPixels: 100_000_000)
  → TesseractService worker pool (bounded, recycled, timeout-terminated)
```

Env vars: `TESSERACT_DIR`, `TESSERACT_POOL_SIZE`, `TESSERACT_PRELOAD`,
`TESSERACT_RECYCLE_JOBS`, `TESSERACT_TIMEOUT_MS` (defaults and validation live in
`packages/backend/src/environment.ts`).
