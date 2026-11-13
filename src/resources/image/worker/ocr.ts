import { pipeline } from 'node:stream/promises';
import sharp from 'sharp';

/**
 * Preprocesses an image for OCR: deskew, downscale, greyscale, normalize, sharpen.
 */
export async function ocr(): Promise<void> {
  const transformer = sharp()
    .rotate()
    .resize({
      fit: 'inside',
      height: 2000,
      width: 2000,
      withoutEnlargement: true,
    })
    .greyscale()
    .normalize()
    .sharpen({ sigma: 1 })
    .png({ compressionLevel: 9 });

  await pipeline(process.stdin, transformer, process.stdout);
}
