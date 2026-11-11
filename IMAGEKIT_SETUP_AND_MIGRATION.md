# AEVORA ImageKit Storage Setup

This release replaces Cloudflare R2 as the destination for **new** AEVORA uploads. The existing Better Auth, MongoDB IDs, media upload/status routes, media optimization, and client UI are retained. It does not require an R2 account. Optional legacy R2 read support remains for old uploads when credentials are supplied.

## 1. Create your ImageKit account

1. Visit https://imagekit.io/ and create an account.
2. In the dashboard, find **Developer Options / API Keys**. Copy the **Private API Key** and optionally the **Public API Key**.
3. Find the **URL Endpoint** in the ImageKit dashboard. It normally resembles `https://ik.imagekit.io/your_imagekit_id`. Use **your own endpoint**, not the demo endpoint.
4. Use the ImageKit Media Library for storage. New media is uploaded under the `/aevora/` folder, which the integration creates automatically.
5. On ImageKit, monitor storage, bandwidth, and any processing/plan limits. ImageKit's billing model is different from R2; do not assume R2's free allowances apply.

## 2. Configure the backend

In `server/`, copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`). Fill in your existing Better Auth, MongoDB, Google OAuth and LiveKit credentials, then replace the ImageKit placeholders:

```dotenv
STORAGE_PROVIDER=imagekit
IMAGEKIT_PRIVATE_KEY=private_your_actual_key
IMAGEKIT_PUBLIC_KEY=public_your_actual_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id
IMAGEKIT_FOLDER_PREFIX=/aevora
```

The private key **must not** appear in `client/.env`, Vite variables, Git commits, logs or a shared ZIP. `IMAGEKIT_PUBLIC_KEY` is optional in the current server-side upload flow; the private key and URL endpoint are required. Leave `IMAGEKIT_CLEANUP_ENABLED=false` until you have reviewed dry-run cleanup candidates.

The `server/.env.imagekit.example` file contains an isolated ImageKit environment template. For local-only development without credentials, set `STORAGE_PROVIDER=local`, but production requires ImageKit.

## 3. Install and start

```powershell
cd server
npm install
npm run dev
```

In another terminal:

```powershell
cd client
npm install
npm run dev
```

Node.js 20+ required. Backend adds `@imagekit/nodejs` version `^7.14.0`. The existing AWS SDK dependencies remain only for reading or migrating legacy R2 media; they are not used for new uploads. The server lockfile will need to be regenerated with `npm install` because the npm registry was inaccessible in the build environment.

## 4. How optimization and storage work

1. An authenticated user selects a file in the existing AEVORA UI.
2. The backend verifies the actual file content, quota, limits and (when required) malware scan.
3. The file is placed in bounded temporary local storage and marked `pending` or `processing` in MongoDB.
4. Sharp converts/resizes images and animated GIFs, or FFmpeg converts videos to streaming-friendly MP4 and creates a WebP poster. PDFs and UTF-8 TXT files are preserved byte-for-byte.
5. The smaller suitable version is retained; the finalized variant is uploaded as a **private** ImageKit Media Library object. The original is not uploaded to ImageKit.
6. ImageKit returns a `fileId`, `filePath`, and size. MongoDB stores the file ID, object key, checksum, original/optimized size, and media ownership. The media becomes `ready` **after** storage succeeds.
7. Temporary source/processed files are cleaned up; AEVORA continues using its authenticated `/api/social/media/:id/file` endpoint (the actual `/api` mounting prefix is unchanged).
8. Browser video range requests use ImageKit's signed delivery URL through the server; `GET /media/:id/signed-url` provides an authenticated temporary link when needed.

The existing client upload states, status polling, storage-savings feedback and video/thumbnail rendering are retained. The client never receives an ImageKit API private key.

### Optimization defaults (configurable in `server/.env`)

| Purpose | Default policy |
| --- | --- |
| Avatar / community icon | <= 512px |
| Cover / social image | <= 1920px |
| Chat image | <= 1600px |
| Video | Up to 1080p MP4 H.264/AAC; CRF 27; faststart |
| GIF | Animated WebP when smaller, GIF fallback where appropriate |
| PDFs / TXT | Preserve bytes, no destructive conversion |

`MAX_USER_STORAGE_MB`, `MAX_IMAGE_MB`, `MAX_VIDEO_MB`, `MAX_MEDIA_DURATION_SEC` and worker concurrency continue to apply.

## 5. Private media and public delivery

All **new** files, including social images, are uploaded with `isPrivateFile: true` and accessed using signed URLs **after** AEVORA's existing server-side authorization check. This is deliberately conservative for privacy. It works for messages, profiles, posts, videos, communities, GIFs, and shared documents. Never turn off the authorization check for a private message just because its ImageKit URL is signed.

For deployment: use HTTPS, require a configured malware scanner, rate-limit uploads, and configure account-level access/billing. No client-side direct uploads or publicly readable storage folder are required in this release.

## 6. MongoDB compatibility

Existing `SocialMedia` collection and `_id` references are retained. Added media fields: `storageFileId` and `thumbStorageFileId`; `storageProvider` now supports `imagekit`. Existing `objectKey`, `thumbObjectKey`, original/optimized size, checksums, and ownership fields remain. New indexes include `{storageProvider:1, storageFileId:1}`. No destructive migration is required for new uploads; MongoDB builds the additional index when the model initializes.

## 7. Existing media migration (optional)

**Do not delete original local files or legacy R2 objects yet.** To inventory existing local/R2 media:

```powershell
cd server
node scripts/migrate-media-to-imagekit.js
```

To migrate at most 20 ready files:

```powershell
node scripts/migrate-media-to-imagekit.js --apply --limit=20
```

Each successful item is uploaded privately, checked using ImageKit file metadata, then its MongoDB media pointer is updated. A JSON manifest is written in the current directory and retains the previous storage location for rollback:

```powershell
node scripts/migrate-media-to-imagekit.js --rollback=media-imagekit-migration-2026-EXAMPLE.json
```

If you previously uploaded to R2, supply **legacy R2 credentials only for migration/read fallback** using the commented `R2_*` fields in `.env.example`. If you never enabled R2, leave them blank. Rollback retains ImageKit copies for a separate audit rather than deleting them automatically. Verify every migrated image and video with a real account before removing older storage.

## 8. Cleanup and monitoring

Safe cleanup is **off** by default. It scans only MongoDB records for stale failed ImageKit uploads (not the entire provider account). Inspect first:

```powershell
node scripts/cleanup-imagekit-incomplete.js
```

To delete the listed abandoned objects:

```powershell
node scripts/cleanup-imagekit-incomplete.js --apply
```

Set `IMAGEKIT_CLEANUP_MIN_AGE_HOURS=72` or higher and leave `IMAGEKIT_CLEANUP_ENABLED=false` until the results are understood. This is a conservative, reference-aware cleanup, not an account-wide ImageKit storage audit. The existing media cleanup worker also preserves attachments actively referenced by posts, conversations, profiles, GIF favorites, and community content.

## 9. Testing checklist

1. Add ImageKit credentials, run `npm install` in the backend, and confirm the server starts.
2. Upload a large JPEG and check that it becomes a smaller WebP, with correct orientation.
3. Upload a transparent PNG and animated GIF. Verify appearance and animation.
4. Upload an MP4 and watch the status progress to Ready. Confirm playback and range seeking.
5. Upload a PDF/TXT to chat and confirm byte-for-byte retrieval and original filename.
6. With Account A, upload a private message attachment. With unrelated Account C, verify access is rejected.
7. Repeat the same upload under the same owner/purpose and confirm provider object reuse when appropriate.
8. Check MongoDB `storageProvider=imagekit`, `storageFileId`, `objectKey`, and size fields.
9. Test cleanup dry run and rollback with non-production data.
10. Confirm profiles, stories, news feed, messaging, GIFs, communities and videos still render normally.

## Documentation

- https://imagekit.io/docs/media-delivery-basic-security
- https://github.com/imagekit-developer/imagekit-nodejs
- https://imagekit.io/docs/transformations
