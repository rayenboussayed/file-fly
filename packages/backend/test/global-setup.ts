import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import sharp from 'sharp';

import { startFakeClamd, stopFakeClamd } from './fake-clamd.js';

// xlsx@0.18.5 ships CJS without an exports map and no default ESM export;
// createRequire sidesteps the interop ambiguity the same way the repo does for CJS-only deps.
const XLSX = createRequire(import.meta.url)('xlsx') as typeof import('xlsx');

/**
Where committed fixture copies and generated media land for e2e runs.
 */
export const FIXTURES_DIR = path.join('test', 'results', 'fixtures');
/**
Scratch cache dir e2e runs use instead of the repo cache.
 */
export const CACHE_DIR = path.join('test', 'results', 'cache');
const FAKE_CLAMD_PORT = 33_331;

const TEXT_SVG = `<svg width="640" height="160" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="160" fill="white"/>
  <text x="20" y="60" font-size="40" fill="black" font-family="DejaVu Sans, sans-serif">The quick brown fox</text>
  <text x="20" y="120" font-size="40" fill="black" font-family="DejaVu Sans, sans-serif">0123456789 OCR</text>
</svg>`;

/**
 * Prepares isolated cache dir and static fixtures (copying assets, generating
 * small images) before any e2e spec runs, then starts a fake clamd on
 * {@link FAKE_CLAMD_PORT} so the antivirus pipeline is exercised without a
 * real ClamAV daemon. Runs once per e2e invocation.
 * @returns An async teardown closing the fake clamd, as supported by vitest globalSetup.
 */
export default async function setup() {
  await fs.promises.rm(path.join('test', 'results'), { force: true, recursive: true });
  await fs.promises.mkdir(FIXTURES_DIR, { recursive: true });
  await fs.promises.mkdir(CACHE_DIR, { recursive: true });

  await fs.promises.copyFile(path.join('assets', 'audios', 'audio-0.mp3'), path.join(FIXTURES_DIR, 'audio-0.mp3'));
  await fs.promises.copyFile(path.join('assets', 'videos', 'video-0.mp4'), path.join(FIXTURES_DIR, 'video-0.mp4'));
  await fs.promises.copyFile(path.join('assets', 'videos', 'tiny.mp4'), path.join(FIXTURES_DIR, 'tiny.mp4'));

  await sharp({
    create: { background: { b: 220, g: 110, r: 30 }, channels: 3, height: 160, width: 640 },
  }).jpeg().toFile(path.join(FIXTURES_DIR, 'photo.jpg'));

  await sharp(Buffer.from(TEXT_SVG)).png().toFile(path.join(FIXTURES_DIR, 'text.png'));

  await fs.promises.writeFile(path.join(FIXTURES_DIR, 'not-an-image.txt'), 'hello, this is not media\n');

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ['name', 'count'],
      ['a', 1],
      ['b', 2],
    ]),
    'People',
  );
  fs.writeFileSync(
    path.join(FIXTURES_DIR, 'basic.xlsx'),
    XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' }) as Buffer,
  );

  // Font fixtures for the /pdf and /font e2es; fail loudly if any is missing.
  fs.copyFileSync(path.join('assets', 'fonts', 'DejaVuSans.ttf'), path.join(FIXTURES_DIR, 'DejaVuSans.ttf'));
  for (const name of ['tiny.ttf', 'tiny.ttc', 'tiny.woff', 'tiny.woff2', 'tiny-empty.ttc', 'tiny-no-os2.ttf', 'tiny-dup.ttf']) {
    fs.copyFileSync(path.join('assets', 'fonts', name), path.join(FIXTURES_DIR, name));
  }
  fs.copyFileSync(path.join('assets', 'models', 'tiny.glb'), path.join(FIXTURES_DIR, 'tiny.glb'));

  const clamd = await startFakeClamd(FAKE_CLAMD_PORT);

  // vitest globalSetup supports returning an async teardown; close the fake clamd when the run is done.
  return async () => {
    await stopFakeClamd(clamd);
  };
}
