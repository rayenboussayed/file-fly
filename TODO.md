# TODO

## Shipped

- Image (sharp/libvips), audio/video (node-av/FFmpeg), documents and spreadsheets (csv/xlsx/docx/pptx/pdf/font/model GLB), OCR (tesseract.js pool), metrics + dashboard, ClamAV fail-closed scanning, cache/LRU/janitor.

## Known gaps / not planned

- `/font/subset` output is PDF-embed only (no cmap); `/font/instances` descoped (no variable-font fixture on this machine); variation axes axis only reported in metadata.
- KTX2 (`KHR_texture_basisu`) textures pass through `/model/optimize` unmodified; no pure-JS encoder ships in the repo.
- `.gltf` (JSON) inputs rejected with 415; self-contained `.gltf` only produced by `POST /model/convert?to=gltf`.
- 3D: no mesh simplification quality guarantees beyond `MeshoptSimplifier(ratio, 0.001)`; draco uses `edgebreaker` q14/q10/q12/q12.
- OCR is a bounded pool of 2 by default (`TESSERACT_POOL_SIZE`); no per-request language pack downloads beyond `TESSERACT_PRELOAD`.
- No authentication/authorization layer anywhere; unauthenticated endpoints by design (see README); deploy behind a reverse proxy with auth if untrusted networks remain in scope.
- Metrics: single-process SQLite; no multi-instance sharing.
- Security advisories: xlsx@0.18.5 accepted (see docs/advisories.md); image-size pinned to ^2.1.0 via override. Janitor can evict between the cache `getOriginalSize` check and `read` (tiny race on the miss path; the read then errors out and the request fails cleanly). fflate's per-part `originalSize` header is trusted for the inflate `out` buffer — memory-safe but a forged oversize part is truncated rather than rejected.

## Wanted but blocked

- `STYLE` preservation across xlsx round trips (SheetJS CE has no style engine; needs a commercial/alternative reader).
- `KHR_materials_unlit` / `KHR_materials_transmission` round trips verified only for read; no fixture in `assets/models` exercises them end-to-end.
