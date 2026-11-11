import { randomUUID } from 'node:crypto';
import { rm, stat } from 'node:fs/promises';
import sharp from 'sharp';
import { AppError } from '../utils/AppError.js';

/**
 * Produce fresh image pixels, never pass user-controlled container/metadata
 * through as the stored community icon or banner. Preview mode only.
 */
export async function sanitizeBrandingImage(input, variant) {
  if (variant !== 'icon' && variant !== 'banner') {
    throw new AppError('Invalid community image type.', 400);
  }
  const output = `${input}-${randomUUID()}.webp`;
  const dimensions = variant === 'icon'
    ? { width: 512, height: 512 }
    : { width: 1600, height: 600 };
  try {
    const pipeline = sharp(input, {
      animated: false, // Static branding only, no animated or embedded payloads.
      failOn: 'warning',
      limitInputPixels: 24_000_000,
    });
    const metadata = await pipeline.metadata();
    // Sharp reports AVIF containers as 'heif'; file-type already restricted
    // the request MIME to AVIF (not HEIC) before this function is called.
    if (!['jpeg', 'png', 'webp', 'heif'].includes(metadata.format)
        || !Number.isFinite(metadata.width)
        || !Number.isFinite(metadata.height)
        || metadata.width < 1
        || metadata.height < 1) {
      throw new Error('Unsupported or malformed raster image');
    }
    await pipeline
      .rotate()
      .resize({ ...dimensions, fit: 'cover', position: 'centre', withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 }) // Outputs pixel data only, strips metadata.
      .toFile(output);
    const { size } = await stat(output);
    if (size < 1 || size > 12 * 1024 * 1024) throw new Error('Sanitized image size is invalid');
    return { filename: output, size };
  } catch {
    await rm(output, { force: true }).catch(() => {});
    throw new AppError('Unable to safely process this image. Select another JPG, PNG, WebP, or AVIF.', 415);
  }
}
