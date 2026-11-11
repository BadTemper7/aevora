import test from 'node:test';
import assert from 'node:assert/strict';
import { useSanitizedBrandingPreview, BRANDING_IMAGE_MIMES } from './brandingPolicy.js';

test('only community icon/banner raster images can use the preview sanitizer', () => {
  for (const variant of ['icon', 'banner']) {
    for (const mime of BRANDING_IMAGE_MIMES) {
      assert.equal(useSanitizedBrandingPreview({ mode: 'sanitize-only', purpose: 'community', variant, mime }), true);
    }
  }
});

test('documents, animated GIFs, videos, and ordinary uploads still require AV', () => {
  for (const purpose of ['message', 'video', 'avatar', 'cover', 'post', 'story', 'story_audio']) {
    assert.equal(useSanitizedBrandingPreview({ mode: 'sanitize-only', purpose, variant: 'icon', mime: 'image/jpeg' }), false);
  }
  for (const mime of ['application/pdf', 'image/gif', 'image/svg+xml', 'video/mp4', 'text/plain']) {
    assert.equal(useSanitizedBrandingPreview({ mode: 'sanitize-only', purpose: 'community', variant: 'banner', mime }), false);
  }
  assert.equal(useSanitizedBrandingPreview({ mode: 'sanitize-only', purpose: 'community', variant: undefined, mime: 'image/png' }), false);
});

test('antivirus remains mandatory by default even for branding', () => {
  assert.equal(useSanitizedBrandingPreview({ mode: 'required-scan', purpose: 'community', variant: 'icon', mime: 'image/png' }), false);
  assert.equal(useSanitizedBrandingPreview({ mode: '', purpose: 'community', variant: 'icon', mime: 'image/png' }), false);
});
