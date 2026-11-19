# Test fixtures

Committed, tiny fixtures for unit/e2e/perf/mem. Only this README documents how
they were built; keep it in sync if you regenerate a fixture.

## fonts/

Built once from the DejaVu family with fontTools (`pip install fonttools brotli`),
using `subset` to keep glyphs minimal and `ttLib` for the TTC merge
(reproducible commands in the commit messages that introduced them).

- `tiny.ttf` — 14 glyphs of DejaVuSans (ASCII letters/digits/punctuation subset).
- `tiny.ttc` — TrueType Collection of `TinySans` (DejaVuSans) and
  `TinySerif` (DejaVuSerif) subsets; collection-member tests.
- `tiny.woff` / `tiny.woff2` — WOFF/WOFF2 flavors of the TinySans subset
  (`.flavor = 'woff'` / `'woff2'` on save; needs `brotli`).
- `tiny-dup.ttf` — TinySans with `0x00A0` (NBSP) mapped onto the `A` glyph
  (tests the per-glyph code-point back-map; NBSP+U+0041 share a gid).
- `tiny-no-os2.ttf` — TinySans with the `OS/2` table deleted (tests the
  "font has no readable OS/2 table" path).
- `tiny-empty.ttc` — hand-written 12-byte empty TTC header (`ttcf` magic,
  version 1, numFonts = 0); tests the "collection with no readable fonts" path.
- `DejaVuSans.ttf` — full DejaVu 2.37 (918 KB). Only font with WinAnsi-fullish
  coverage; used for PDF embedding/Unicode tests. Mirrored from the system
  fonts directory with permission to redistribute (DejaVu license).

## models/

- `tiny.glb` — 1 KB glTF-binary built with `@gltf-transform/core`
  (Document: scene `TinyScene` + node `TinyNode` + one red triangle mesh +
  one-primitive material + one-pixel PNG base-color texture; scripts in
  commit messages).

## videos/

- `tiny.mp4` (17 KB) — 1 s `testsrc2` 160x120 @ 10 fps, ` sine=440 Hz` audio,
  libx264/aac; generated with ffmpeg.
- `tiny32.mp4` (7 KB) — same but 32x32 for the sub-64 px PDQ trim fallback.

## audios/

- `tiny.mp3` — 1 s 440 Hz sine, mono 16 kHz, libmp3lame with the Xing header
  (`-write_xing 1`) so `ffprobe`/node-av can report duration 1.

## gifs/ images/ videos/

`audio-N.mp3`, `video-N.mp4`, `gif-N.gif`, `image-N.jpg` — pre-existing
fixtures kept for compatibility with older specs and e2e (`global-setup.ts`
copies them into `test/results/fixtures/`). Prefer the `tiny.*` fixtures in
new specs.
