# AEVORA R2 release: files changed

**Base:** latest `aevora_notifications_dropdown_unread_updated_full_project.zip` derived from the user's updated `aevora.zip`. No navigation, homepage, notification, chat bubble, or community layout was replaced.

## New backend files
- `server/src/storage/r2.js`: single private R2 S3 SDK adapter (stream, upload, delete, head, signed GET, listing).
- `server/src/media/policy.js`: media optimization size/format policy and savings calculation.
- `server/src/media/scan.js`: configurable, fail-closed ClamAV integration.
- `server/src/media/orphanCleanup.js`: bounded reference-checked R2 orphan sweep.
- `server/scripts/migrate-media-to-r2.js`: dry-run, verify-before-switch migration with manifest and rollback.
- `server/scripts/cleanup-r2-orphans.js`: manual/admin cloud cleanup command.
- `server/test/r2Policy.test.js`: pure policy and source integration regression checks.
- `server/.env.example` and `server/.gitignore`: safe configuration template and ignored credentials/storage.

## Modified backend files
- `server/src/config/env.js`: conditional R2 environment validation, upload quotas and video duration configuration.
- `server/src/social/models.js`: extended existing `Media` schema, no duplicate collection.
- `server/src/media/processor.js`: optimized-only storage worker, animated WebP, 1080p MP4, thumbnail, hash and dedupe, cloud upload, cleanup.
- `server/src/media/routes.js`: upload validation/virus scanning, quota, optional intent, R2 private streams/ranges, status/savings, signed URL, storage usage.
- `server/src/server.js`: optional scheduled orphan cleaning.
- `server/package.json`: new `@aws-sdk/client-s3`, `@aws-sdk/lib-storage`, `@aws-sdk/s3-request-presigner` dependencies.

## New frontend files
- `client/src/workers/imageOptimizer.worker.js`: optional off-main-thread browser image compression.
- `client/src/features/social/api/optimizeUpload.js`: worker invocation and safe fallback.

## Modified frontend files (design preserved)
- `client/src/features/social/api/socialApi.js`: optional browser pre-optimization, original-size metadata, unified existing upload endpoint.
- `client/src/features/social/components/MediaPicker.jsx`: existing upload control now exposes preparation, optimization, progress and savings.
- `client/src/features/communities/pages/CommunityDiscoveryPage.jsx`: image intent for community icon and banner.
- `client/src/features/communities/components/CommunitySettingsPanel.jsx`: same image intent on existing editor.

**Lockfile:** `server/package-lock.json` could not be updated because the npm registry was unreachable here. Run `npm install` locally in `server/` to generate it. Do not use `npm ci` until the lockfile is regenerated. The existing client lockfile is unchanged.
