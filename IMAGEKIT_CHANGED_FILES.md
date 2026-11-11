# ImageKit Integration: Modified and Added Files

## Backend changed

- `server/src/config/env.js`: ImageKit environment validation and production provider choice; legacy R2 optional read-only credentials.
- `server/.env.example`: ImageKit configuration, optimization controls, conservative cleanup settings.
- `server/package.json`: add `@imagekit/nodejs` (AWS SDK retained only for legacy R2 reads/migration).
- `server/src/social/models.js`: support `imagekit`, `storageFileId`, `thumbStorageFileId`, and a file-ID index.
- `server/src/media/processor.js`: upload **after** Sharp/FFmpeg, provider-scoped dedup, record file IDs, cleanup and failure states.
- `server/src/media/routes.js`: authorized signed URL and private video streaming for ImageKit, with existing local and legacy R2 read compatibility.
- `server/src/media/orphanCleanup.js`: conservative failed-upload cleanup, replacing active R2 orphan scans.
- `server/src/server.js`: optional ImageKit stale-upload cleanup scheduling.
- `server/src/storage/r2.js`: legacy credentials enable **reading existing** files even while ImageKit is the active provider.
- `server/test/mediaOptimizationPolicy.test.js`: pre-storage processing and policy regression tests.

## Added

- `server/src/storage/imagekit.js`: server-only ImageKit uploads, file metadata, delete, signed download, streaming.
- `server/src/storage/imagekitPaths.js`: pure, testable object-key and path validation.
- `server/scripts/migrate-media-to-imagekit.js`: dry run, verified migration, retained-source rollback.
- `server/scripts/cleanup-imagekit-incomplete.js`: reference-aware failed-upload cleanup with opt-in apply.
- `server/test/imagekitStorageContract.test.js`: new storage-specific regression tests.
- `server/.env.imagekit.example`: concise ImageKit environment setup template.
- `client/.env.example`: optional public frontend settings; never any ImageKit private key.
- `IMAGEKIT_SETUP_AND_MIGRATION.md`, `IMAGEKIT_CHANGED_FILES.md`, `IMAGEKIT_VERIFICATION_REPORT.md`.

## Removed or archived

- Removed old scripts that would write **new** objects to R2: `migrate-media-to-r2.js`, `cleanup-r2-orphans.js`.
- Archived R2 setup and release documents under `docs/legacy/` for reference.

## Client design

All pre-existing files in `client/` remain byte-for-byte unchanged. The only client addition is a non-secret `.env.example`. All media upload, status, and playback endpoints have their original paths and response shapes.

## API changes

No new mandatory client APIs. Existing `POST /media`, `GET /media/:id/status`, `GET /media/:id/file`, `GET /media/:id/signed-url`, retry, delete, and storage summary continue using existing mounting prefixes. The signed-url response now returns ImageKit-signed URLs for ImageKit media. Older local and legacy R2 references are recognized. New media metadata includes ImageKit file IDs internally; these are not exposed to browser API responses.
