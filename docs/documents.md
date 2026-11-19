# Document, spreadsheet, font and 3D model endpoints

Server-side document generation and extraction, no browser or third-party
service required. All routes are **POST-only** and answer **201**; bodies are
either `application/json` with a `.strict()` zod-validated payload **build**
routes, or raw binary uploads that go through the ClamAV pipeline.

General rules across these routes:

- JSON build routes bypass the media parser by design; the body is hard-capped
  (Fastify `bodyLimit` is 16 MiB) and unknown keys are rejected with 400.
- Binary routes (`extract`, `metadata`, `shape`, `subset`, `optimize`,
  `convert`) are `POST`-only — they never proxy `?source=<url>`; uploads are
  scanned with ClamAV (`FileScannerInterceptor`) before any parsing, fail-closed
  (`infected → 422`, `daemon down → 503`, oversize → 413), and are buffered
  whole (≤ 25 MiB) rather than streamed end to end — see [antivirus.md](antivirus.md).
- Binary routes enforce a signature gate: the detected `file-type` must match
  the family (`xlsx`, `docx`/`pptx` (OOXML), `pdf`, `ttf/otf/woff/woff2/ttc`,
  `model/gltf-binary`) or the request is rejected with `415`.
- An empty body answers `400` (`content-length: 0`), never an unhandled 500.
- Every route is authenticated exactly like the media routes: none of them
  carry API-key/cookie requirements today, and all of them are rate-limited by
  the reverse proxy (none exists in the repo itself).
- Worker threads run the heavy builders (docx/pptx builds and `/model/optimize`),
  not the pdf or xlsx builders (both in-process); the worker is fed via
  `workerData`, and its stdout is the binary channel — worker logs go to stderr.
  Worker threads are capped at `max(2, cpus - 1)` concurrent; excess calls queue.
- Responses for binary payloads set `content-type`, a
  `content-disposition: attachment; filename="…"`, and are streamed with
  backpressure.

Error-code conventions (all modules):

- `400` — schema validation failure (unknown key, bad enum, malformed tag)
  plus module-specific `CODE` strings for semantic rejections (e.g.
  `PDF_TEXT_NOT_REPRESENTABLE`, `MODEL_UNREADABLE`, `PPTX_SLIDE_MISSING`).
- `413` — the body exceeded a cap (16 MiB body cap, CSV record cap of 1 000 000,
  or the OOXML total / per-entry / element caps for docx/pptx — xlsx maps the
  same cap failures to `400 XLSX_INVALID_ZIP`; only xlsx cell overflow maps to
  `413`).
- `415` — the detected signature does not match the route family.
- `422` — ClamAV flagged the payload as infected.
- `503` — ClamAV not configured (binary routes) or daemon unreachable
  when it was required.
- `500` — the builder/orchestrator failed after validation; this should be
  rare and always indicates a bug, not client error.

Full request schemas live in the code (`src/resources/*/schema.ts`) and are
rendered by Swagger at `/swagger` — this page documents the intent, limits and
non-obvious behavior, not every parameter.

## /csv

`text/csv` (or `application/octet-stream`) uploads; canned options mirror
[`csv-parse`](https://www.npmjs.com/package/csv-parse) /
[`csv-stringify`](https://www.npmjs.com/package/csv-stringify) and reach it
directly.

| Route | Body / query | Returns |
| --- | --- | --- |
| `POST /csv/build` | JSON `{ records: [...], options?: {…} }` — rows as objects (keys→cells) or positional arrays (order from `options.columns` when given) | `text/csv` attachment (`export.csv`), BOM optional, `escape_formulas` defaults to `true` (untrusted sheets) |
| `POST /csv/extract` | Binary CSV; query: `columns` (`true` = first row as header, or a `,`-separated list of header names), `delimiter` (`auto` when unset), `cast`, `cast_date`, `bom`, `trim`, `comment`, and the rest of the csv-parse flat options | `{ records: [...] }` (≤ 1 000 000 records, else `413`); formula-leading values pass through unfiltered |
| `POST /csv/metadata` | Binary CSV; query: `maxRows` (type-census cap, default 10 000, max 100 000) plus the flat parse options | `{ rows, columns, delimiter (the supplied value, or `auto`), bom, maxRows, recordDelimiter, perColumn: [{ index, types: { boolean, date, empty, number, string } }], truncatedTypes }` — a lightweight type census, not a formula engine |

Formula injection note: `escape_formulas` (default true) prepends a `'` to
cells beginning with `= + - @ \t \r` on build. Extracts return raw values; it
is the caller's responsibility not to re-export them into a spreadsheet
program unguarded.

## /xlsx

| Route | Body / query | Returns |
| --- | --- | --- |
| `POST /xlsx/build` | JSON `{ sheets: [{ name, rows, cols?, merges?, autofilter?, sheetVisibility?, ... }], workbook?: { Props?, WBProps?, Names? }, … }` — cells are `{ t?: 'b'/'d'/'n'/'s', v, z? }` objects or primitives; formula cells pass through with `f` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` attachment |
| `POST /xlsx/extract` | Binary .xlsx; query: `sheet` (name, or 0-based index as string), `raw` (default true: unformatted values), `header` (`1` = array of rows, `A` = column letters, `name,with,keys`) | `{ records: [...], sheet: name }` (header row consumed); over 1 000 000 records the output is sliced and `truncated: true` is added |
| `POST /xlsx/metadata` | Binary .xlsx; query: `maxCells` (`1..20_000_000`, default 2 000 000 — checked before SheetJS parses) | Workbook + per-sheet metadata: dims, typed-cell census, formulas, merges, autofilter, defined names, hidden rows, dates, app/core props |

Formula refusal happens at build time: `POST /xlsx/build` rejects formula
cells whose formula is unsafe (`XLSX_FORMULA_REJECTED` — DDE / remote-exec
patterns such as `CMD|'…'` or `DDEAUTO` in a cell or a defined name) or starts
with `=` (`XLSX_FORMULA_LEADING_EQUALS`). Extract never refuses formulas; it
reports them verbatim.

Known limits: style-per-cell round trip is intentionally shallow (SheetJS
Community Edition has no style engine); conditional formatting, charts and
images are not preserved on build or extract. `date1904` workbooks are refused
for writing (`XLSX_DATE1904_UNSUPPORTED`) because SheetJS would silently
re-serialize dates with the 1900 epoch. Excel's 1 048 576-row limit is not
enforced — `maxCells` is the only gate. v0.18.5 ships two known advisories
([GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6),
[GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9)) — see
[advisories.md](advisories.md).

## /docx

| Route | Body / query | Returns |
| --- | --- | --- |
| `POST /docx/build` | JSON `{ sections: [{ children: [...], headers?, footers?, properties? }], metadata?, footnotes?, endnotes?, comments?, numbering? }` — build paragraphs, tables, images, TOC, fields, hyperlinks | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` attachment |
| `POST /docx/extract` | Binary .docx | Text runs, paragraphs, table cells, hyperlinks, fields, images (names + sizes), headers/footers, comments, footnotes, endnotes; structure: `{ sections, tables, images, hyperlinks, … }` |
| `POST /docx/metadata` | Binary .docx | docProps/core.xml + app.xml merged (`title`, `creator`, `revision`, `created`, `modified`, `pages`, `words`, …) plus part counts |

## /pptx

| Route | Body / query | Returns |
| --- | --- | --- |
| `POST /pptx/build` | JSON `{ layout?, theme?, metadata?, slides: [{ background?, notes?, elements: […] }] }` — elements: text, shape, image, chart, table; chart types bar/bar3d/line/pie/doughnut/area/scatter/radar, 1–50 series per chart | `application/vnd.openxmlformats-officedocument.presentationml.presentation` attachment |
| `POST /pptx/extract` | Binary .pptx | Slide tree (text runs with formatting, images, shapes, tables, charts, speaker notes); `{ format: 'pptx', metadata, structure: { slides: […] } }` |
| `POST /pptx/metadata` | Binary .pptx | docProps/core.xml + app.xml merged (title, author, company, company, slide count, …) |

pptx builds run in a worker thread; the worker re-validates the archive it
just produced (`Invalid document: file … missing ppt/presentation.xml`) before
the parent reports success — a builder failure answers 500, never a torn file.

## /pdf

| Route | Body / query | Returns |
| --- | --- | --- |
| `POST /pdf/build` | JSON `{ metadata?, pages: [{ size?: 'a4', 'letter', 'legal', 'tabloid', margin?, orientation?, elements: […] }] }` — elements: text, line, rect, ellipse, image, table (cells with colSpan/rowSpan), field (AcroForm text/checkbox), pageNumber, pageBreak; body-level `embeddedFonts: [{ name, data (base64) }]` referenced from elements via `font` | `application/pdf` attachment (`export.pdf`) |
| `POST /pdf/extract` | Binary .pdf (no options; page text always comes per page) | `{ format: 'pdf', metadata: { author, creationDate, creator, keywords, modificationDate, producer, subject, title }, pageCount, structure: { pages: [{ page, text }] }, text }` — documents over 500 pages answer `400 PDF_TOO_MANY_PAGES` |
| `POST /pdf/metadata` | Binary .pdf | `{ author, creationDate, creator, encrypted, keywords, modificationDate, orientation, pageCount, pageSize: { width, height }, producer, subject, title }` |

Font rules: by default text is encoded in Windows-1252 (WinAnsi) — characters
outside that range are rejected with `PDF_TEXT_NOT_REPRESENTABLE`. Pass a
body-level `embeddedFonts` entry (`{ name, data }`, base64 TTF/OTF) and
reference it from an element's `font` to encode arbitrary Unicode; the font is
subset and embedded, and `.notdef` glyphs are kept so the subset stays valid
for PDF embedding.

## /font

All routes take a binary font (TTF/OTF/WOFF/WOFF2/TTC — signature-gated,
ClamAV-scanned). `?font=<postscript-name>` selects a collection member; unknown
names answer `400 FONT_UNKNOWN_MEMBER`.

| Route | Body / query | Returns |
| --- | --- | --- |
| `POST /font/metadata` | Binary font | `{ familyName, subfamilyName, ps/full names, version, ascent/descent/unitsPerEm/…, bbox, italicAngle, fsType embedding bits, characterSetSize, availableFeatures, variationAxes, namedVariations, format, collection }` |
| `POST /font/extract` | Binary font; query: `limit` (max 10000) | Per-glyph records (`id`, `name`, `codePoints`, `advanceWidth`, `bbox`, `isLigature`, `isMark`) — `codePoints` is back-mapped from cmap (fontkit's `getGlyph` does not back-map) |
| `POST /font/shape` | Binary font; query: `text` (required), `script`, `language`, `direction`, `features` (`+tag`/`-tag`) | Glyph runs with positions + aggregate metrics; `400 FONT_INVALID_FEATURE` on malformed 4-char tags |
| `POST /font/subset` | Binary font; query: `text` | Minimal sfnt for PDF embedding (header `x-font-subset: pdf-embed`; **no cmap**). CFF-based OTF inputs → `400 FONT_SUBSET_UNSUPPORTED` |

/font/subset output is **not** a standalone web font and **not** a valid input
for `@pdf-lib/fontkit`'s own subsetting path — use it for PDF embedding only.

## /model (3D)

All routes take a binary **GLB**. `.gltf` with external resources is rejected
with `415`; `POST /model/convert?to=gltf` produces a self-contained `.gltf`
(data-URI inlined buffers/images) which is *output*, not input.

| Route | Body / query | Returns |
| --- | --- | --- |
| `POST /model/metadata` | Binary GLB | `{ asset, counts, bounds, extensionsUsed, extensionsRequired, format: 'model' }` (`bounds` = dequantized when `KHR_mesh_quantization`) |
| `POST /model/extract` | Binary GLB | Scene tree (depth-capped at 32, `childrenTruncated` marks elisions; total emitted nodes capped at 10 000 → `MODEL_TOO_COMPLEX`), meshes (attributes, `mode`, targets, vertices, triangles), materials, textures (bytes, mimeType), animations, skins |
| `POST /model/optimize` | Binary GLB; query: `compress` (`meshopt` (default) / `draco` / `none`), `simplify` (0–1, 1 = off; <1 forces weld), `weld` (boolean, default true) | Lossily simplified + compressed GLB, re-validated in-worker before the parent reports success; extension set is never narrowed silently (`KHR_*`, `EXT_mesh_gpu_instancing`, … registered; `KTX2` passes through untouched) |
| `POST /model/convert` | Binary GLB; query: `to` (`glb` lossless round-trip \| `gltf` self-contained JSON) | Converted container with correct content type |

Optimization is CPU-heavy and runs in a worker thread; `simplify < 1` forces
`weld` because meshopt simplification builds on welded topology. Geometry is
always preserved in `glTF` version `2.0`; `KHR_texture_basisu` inputs pass
through byte-identically (no pure-JS KTX2 encoder ships in this repo).

## Fixture fonts and models

Unit and e2e fixtures live in `packages/backend/assets/` and are documented in
`assets/README.md` (provenance, generation commands and redistribution notes).
The tiny fixtures are all under ~20 KB; `DejaVuSans.ttf` (WinAnsi-complete,
for PDF embedding and Unicode tests) is committed under the DejaVu license.

## Tested surface

Every route has unit specs in `src/resources/*/  …` and an e2e spec in
`test/<module>.e2e-spec.ts` (global fake ClamAV on `FAKE_CLAMD_PORT=33331`); all
129 e2e tests run offline against fixtures. The bench suite covers document
generation throughput (`npm run test:perf`); the memory-regression suite
covers repeated PDF builds (`npm run test:mem`).
