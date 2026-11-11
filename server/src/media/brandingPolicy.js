/**
 * A deliberately narrow preview-only alternative for community branding images.
 * This is not antivirus scanning. Production deployments should use a real
 * ClamAV scanner and leave COMMUNITY_BRANDING_IMAGE_MODE=required-scan.
 *
 * Only the four raster formats supported by the community picker qualify.
 * Every accepted image is fully decoded and re-encoded with Sharp before it
 * reaches the media worker or permanent storage. Other uploads still require AV.
 */
export const BRANDING_IMAGE_MIMES = Object.freeze([
  'image/jpeg', 'image/png', 'image/webp', 'image/avif',
]);

export function useSanitizedBrandingPreview({
  mode = process.env.COMMUNITY_BRANDING_IMAGE_MODE || 'required-scan',
  purpose,
  variant,
  mime,
}) {
  return mode === 'sanitize-only'
    && purpose === 'community'
    && (variant === 'icon' || variant === 'banner')
    && BRANDING_IMAGE_MIMES.includes(mime);
}
