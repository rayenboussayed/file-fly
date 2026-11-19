# Advisory exceptions and accepted risk

This file tracks the known vulnerable dependencies that are accepted in this
repository, why, and what mitigates them. Anything not listed here should fail
`npm audit` review in `.husky/pre-commit` (which runs `npm audit fix || true`
— the `|| true` means audits never block a commit, so this document is the
compensating record, not the hook).

## xlsx@0.18.5 — accepted (user-approved 2026-11-19)

- Advisories: [GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/ghsa-4r6h-8v6p-xvw6) (prototype pollution),
  [GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/ghsa-5pgg-2g8v-p4x9) (ReDoS).
- No fixed release exists in the 0.18.x line; the package is unmaintained upstream.
- Compensating controls:
  - SheetJS **does not evaluate formulas** — reading a hostile workbook never executes anything.
  - Build-time formula refusal: formula cells whose formula is unsafe
    (`XLSX_FORMULA_REJECTED` — DDE/remote-exec patterns such as `CMD|'…'`,
    `MSEXCEL|'…'`, `DDEAUTO`, `WEBSERVICE(`, `DDE(`) or starts with `=`
    (`XLSX_FORMULA_LEADING_EQUALS`) are refused on `POST /xlsx/build`, in
    cells and in defined-name references (`Names[].Ref`).
  - Pre-parse caps before SheetJS sees anything: declared `content-length`
    cap (413), cell census (`maxCells`, default 2 000 000) without parsing,
    and OOXML container caps (10 000 entries / 32 MiB per entry / 256 MiB
    total inflated) before inflation.
  - Uploads are ClamAV-scanned (`FileScannerInterceptor`, fail-closed).
- Revisit when SheetJS ships a fixed release, or when the project migrates to
  a maintained parser.

## image-size — override applied (user-approved 2026-11-19)

- Advisories: [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/ghsa-5p2g-fcmc-qvqq),
  [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/ghsa-w3rx-r6r6-pgpr)
  (DoS via infinite loops in the JXL/HEIF/ICNS parsers).
- Path: `pptxgenjs@4.0.1 → image-size@^1.2.1` (pptxgenjs declares it; the
  distributed bundle never `require()`s it — image sizing on the Node path
  goes through an optional `sizeof` with a null fallback — but the package
  would still be evaluated at import time in any future code path).
- Control: root `package.json` pins `overrides: {
  "pptxgenjs": { "image-size": "^2.1.0" } }`; locked to 2.1.0, engines `node >= 18`.
  `npm audit --omit=dev` reports no image-size advisories.
- Note: npm's blanket-override form did not re-resolve the stale lock
  entry on this machine; the lock was repaired manually and `npm ci --dry-run`
  validates it. If the lock is ever regenerated from scratch, keep the nested
  override above (it resolves cleanly — verified against a scratch project).

## EICAR / test artifacts

`test/fake-clamd.ts` (fake clamd on `127.0.0.1:33331`) is written only to mark
files whose bytes start with the EICAR marker; it stores no payloads.
