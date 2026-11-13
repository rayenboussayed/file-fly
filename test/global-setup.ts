import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export const FIXTURES_DIR = path.join('test', 'results', 'fixtures');
export const CACHE_DIR = path.join('test', 'results', 'cache');

const TEXT_SVG = `<svg width="640" height="160" xmlns="http://www.w3.org/2000/svg">
  <rect width="640" height="160" fill="white"/>
  <text x="20" y="60" font-size="40" fill="black" font-family="DejaVu Sans, sans-serif">The quick brown fox</text>
  <text x="20" y="120" font-size="40" fill="black" font-family="DejaVu Sans, sans-serif">0123456789 OCR</text>
</svg>`;

/**
 * Prepares isolated cache dir and static fixtures (copying assets, generating
 * small images) before any e2e spec runs. Runs once per e2e invocation.
 */
export default async function setup() {
  await fs.promises.rm(path.join('test', 'results'), { force: true, recursive: true });
  await fs.promises.mkdir(FIXTURES_DIR, { recursive: true });
  await fs.promises.mkdir(CACHE_DIR, { recursive: true });

  await fs.promises.copyFile(path.join('assets', 'audios', 'audio-0.mp3'), path.join(FIXTURES_DIR, 'audio-0.mp3'));
  await fs.promises.copyFile(path.join('assets', 'videos', 'video-0.mp4'), path.join(FIXTURES_DIR, 'video-0.mp4'));

  await sharp({
    create: { background: { b: 220, g: 110, r: 30 }, channels: 3, height: 160, width: 640 },
  }).jpeg().toFile(path.join(FIXTURES_DIR, 'photo.jpg'));

  await sharp(Buffer.from(TEXT_SVG)).png().toFile(path.join(FIXTURES_DIR, 'text.png'));

  await fs.promises.writeFile(path.join(FIXTURES_DIR, 'not-an-image.txt'), 'hello, this is not media\n');
}
