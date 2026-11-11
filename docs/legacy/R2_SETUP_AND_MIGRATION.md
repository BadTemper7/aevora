# AEVORA: Cloudflare R2 integration and rollout

This release is based on the **latest AEVORA client design** and notifications-dropdown project derived from the uploaded `aevora.zip`. The existing app routes, media IDs, MongoDB user IDs, sessions and navigation are preserved.

## 1. Create the R2 bucket

1. In Cloudflare Dashboard > R2 Object Storage, create a **private** bucket called `aevora-media` (or your chosen name).
2. Create an R2 API token with read/write access scoped to the chosen bucket. Never use your Cloudflare account-wide API key.
3. Set `server/.env` using `server/.env.example`. Do not commit credentials or send them to the client.
4. Set `STORAGE_PROVIDER=r2` and all of `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`; `R2_ENDPOINT` is optional and defaults to the account S3 endpoint.
5. Install dependencies in both `server` and `client` (`npm install`). FFmpeg/FFprobe must be on PATH for video processing. In production install/configure ClamAV and `clamdscan` (or configure `CLAMAV_COMMAND` to a compatible scanner). Production mode always requires successful malware scanning before upload; for local development the example disables scanning until a scanner is available.
6. Start `npm run dev` in both folders, or `npm start` for production backend.

**Access rules:** The media bucket stays private. AEVORA validates each request against MongoDB ownership, message membership, post/story/video visibility, block rules, and channel permissions before serving objects. The normal image/video URL remains `/api/social/media/:id/file`; this route streams R2 objects, including HTTP range support for videos, without exposing keys. `GET /api/social/media/:id/signed-url` is an optional 60-second bearer URL that can be used only **after** authorization. Handle signed URLs as secrets. Public R2 custom domains are **not** used for this mixed-private bucket; put truly public media in a separate public bucket/domain before enabling `R2_PUBLIC_URL`.

**CORS:** The default app uploads to the authenticated AEVORA backend, not directly from the browser to R2; no public R2 PUT CORS policy is required. If you enable browser playback using the optional signed URL API, configure bucket CORS to permit your app origin for GET/HEAD, for example:

```json
[{"AllowedOrigins":["https://your-app-domain.com","http://localhost:5173"],"AllowedMethods":["GET","HEAD"],"AllowedHeaders":["*"],"ExposeHeaders":["ETag","Content-Length","Content-Range"],"MaxAgeSeconds":3600}]
```

Cloudflare presigned URLs use the S3 API endpoint, **not** an R2 custom domain. Never create unauthenticated public URLs for private chats.

## 2. Mandatory optimization pipeline

`POST /api/social/media` checks authentication and rate limits; Multer writes to a bounded temporary local file; a concurrency guard and free-disk threshold protect against excessive staging usage. The backend checks actual MIME signature, applicable sizes/quota, purpose, and optional/required ClamAV scan before queuing the media in MongoDB. Only the **optimized** output is uploaded via AWS S3 multipart uploader to the private R2 bucket. The Media document is set `ready` only after object storage succeeds.

| Kind | Processing | Decision |
|---|---|---|
| JPEG/PNG/WebP/AVIF | Sharp auto-orient, bounded resize, WebP quality 78, optional thumbnail | Keep smaller valid original when auto-orientation and dimensions permit |
| GIF | Sharp animated WebP with loop preserved, single-frame thumbnail | Retain smaller original GIF if preferable, preserving animation |
| Video | FFprobe validates duration; FFmpeg outputs H.264/AAC MP4, max 1080p, `+faststart`, thumbnail | Retain smaller compatible H.264/AAC MP4 when safe; never upscale |
| PDF and UTF-8 TXT | Preserve bytes exactly | Avoid invalidating digital signatures or changing document contents |

Large still images may be pre-optimized in an OffscreenCanvas **Web Worker** (only for safe JPEG/PNG/WebP cases). The backend always validates and applies its own rules; browser-side optimization is never trusted. The UI shows preparation, optimization, transfer, server processing and verified stored-size feedback.

Additional data in existing `social_media` documents: `storageProvider`, `bucket`, `objectKey`, `thumbObjectKey`, `originalSize`, `receivedSize`, `optimizedSize`, `thumbSize`, `sourceChecksum`, `checksum`, `compressionRatio`, `duration`, `variant`, `migratedAt`. No media binaries are stored in MongoDB. Mongo indexes are declared in the Mongoose schema (Mongoose normally builds them when index creation is enabled).

## 3. New storage API endpoints

- `POST /api/social/media`: existing upload endpoint, same multipart file/purpose. Optional `sourceOriginalSize`, `originalName`, and `variant=icon|banner` for community images.
- `GET /api/social/media/:id/status`: existing endpoint; now returns original and optimized bytes and savings percent for the owner.
- `POST /api/social/media/:id/retry`: existing processing retry, using locally retained staging file until cleanup.
- `GET /api/social/media/:id/file?thumb=1`: existing authenticated delivery route, transparent local/R2 fallback with video Range.
- `GET /api/social/media/:id/signed-url`: **new**, ownership/visibility-checked, temporary R2 GET link.
- `GET /api/social/media/storage/me`: **new**, per-user counts, quotas and storage savings.
- `DELETE /api/social/media/:id`: existing route now protects in-progress jobs and deletes the R2 object only when no other media record references it.

Uploads are queued in the existing MongoDB-backed worker with `VIDEO_WORKER_CONCURRENCY` (default 2). This is a baseline implementation; dedicated queue infrastructure (BullMQ/Redis), horizontal scaling, more complete progress telemetry and load tests are recommended before heavy public traffic.

## 4. Existing local media migration

Run migration on the machine with access to the **old local `server/storage` directory**. Backup MongoDB and the storage directory first. New code can continue to serve old local uploads while migration proceeds.

```
cd server
node scripts/migrate-media-to-r2.js --limit=100
node scripts/migrate-media-to-r2.js --apply --limit=100
```

- **Without `--apply`**, writes an inventory/plan only, uploads nothing, changes no records.
- `--apply` uploads the existing **already-optimized** `processed/` files and thumbnails (no re-encode of possibly signed documents). It verifies R2 object ContentLength before switching MongoDB pointers.
- Source files remain on disk until you independently verify the updated app. The manifest stores migrated IDs and object keys. Repeat in batches.
- To restore local pointers using the manifest: `node scripts/migrate-media-to-r2.js --rollback=./media-migration-xxx.json`. Rollback requires the local files to still exist. The R2 copies remain for audit and can be removed by the separate orphan-cleanup workflow.
- Verify randomly sampled public and private media in the app after each batch, and confirm attachments remain accessible to authorized users only.

## 5. Storage cleanup

- Temporary upload files older than 24 hours are removed if not owned by pending processing records. Original staging inputs are deleted after confirmed success, but preserved for retries on failure.
- An existing media garbage collector verifies references from posts, videos, stories, private chats, community messages, profile avatars, community images, conversation avatars and GIF favorites before removing an unused media record.
- Before deleting R2 objects, it checks for **any other `Media` record** referencing that key. Deduplication only shares blobs with the same `ownerId` and `purpose`.
- AWS SDK multipart uploader aborts multipart uploads when an upload errors. In the R2 Dashboard configure automatic incomplete multipart-upload expiry (default seven days) and monitor it.
- To audit unreferenced cloud objects: `node scripts/cleanup-r2-orphans.js`. To delete after inspection: `node scripts/cleanup-r2-orphans.js --apply` (objects must be at least 72 hours old, scans at most 500 objects by default). To schedule a bounded daily sweep set `R2_CLEANUP_ENABLED=true`. Extra R2 List requests incur operations costs.

## 6. Testing and rollout

1. Confirm `STORAGE_PROVIDER=r2` and server startup validates required credentials.
2. Upload a big JPEG, a transparent PNG, an animated GIF, a PDF, and a short MP4. Confirm status progresses to `ready` **only after** storage.
3. Verify output dimensions, WebP/GIF animation, video H.264 playback, and content-preserving PDF/TXT downloads; compare original/stored sizes in UI.
4. Verify an unauthorized account cannot fetch private message media, including signed URL endpoint.
5. Verify MIME masquerading, too-large files, malicious scans and quotas reject correctly.
6. Upload identical media twice from the same account/purpose, then check both media IDs reference one cloud object. Verify cross-owner uploads do not disclose duplicate existence.
7. Delete one duplicate and confirm remaining media works. Delete the last unreferenced duplicate, verify cloud cleanup.
8. Restart the server while an upload is pending, then retry and confirm it recovers. Verify no unfinished video is visible.
9. Test phone and desktop image/video playback, including HTTP byte-range streaming and mobile controls.
10. Verify migration and rollback on a backup before modifying production records.

**Not verified in this environment:** live R2 authentication/PutObject/Range/HeadObject, ClamAV, MongoDB persistence, two-account authorization, full npm installation, full Vite build, or real production traffic. These require your configured services.

### Storage savings benchmark (synthetic, not a prediction)

A generated 2-second 1280×720 H.264 MP4 encoded with FFmpeg using high bitrate was 1,993,755 bytes. A re-encode using the release's FFmpeg codec/quality settings produced 373,435 bytes (about **81.3% smaller**). Real video savings vary, and efficiently encoded files may be kept without compression.
