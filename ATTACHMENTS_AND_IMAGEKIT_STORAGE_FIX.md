# AEVORA: Chat Attachments and ImageKit Storage Fix

This release is based on the latest AEVORA ImageKit-integrated source, not an older UI snapshot. It does not replace the homepage, navigation, chat details, or application design system.

## Chat behavior

- The attachment button accepts up to four images, videos, GIFs, PDF, or TXT documents per message.
- Adding files shows previews inside the existing composer **without uploading**. Images can be enlarged; videos show a video frame/play control and length; documents show their original names and sizes. Each preview has Remove.
- Drag-and-drop and paste work with supported file types, with duplicate selection checks.
- A Send button remains visible at all times, and is only enabled when text or at least one attachment is present. Enter submits; Shift+Enter inserts a line. For editing, the button saves changes.
- When sending, the existing centralized optimization and upload endpoints are used. The draft stays available if a transfer or message submission fails; retrying does not automatically reupload files that already completed.
- The sender sees an optimistic bubble while files are processed. A persisted message is created only once **every** media ID is ready. Socket.IO and HTTP results reconcile using `clientId`, then replace local previews with saved media.
- Messages can contain multiple media types and optional text. The backend returns per-file metadata, so images, videos, and documents render correctly inside the same message. Existing messages retain their original behavior.

## Why ImageKit showed two images

Before this release the media worker always created and uploaded an optimized image **and** a separate 320px thumbnail. This created two ImageKit Media Library files for each new image or GIF upload.

**New behavior:** The worker stores only the optimized ImageKit image/GIF. A smaller preview is generated on demand using an authenticated, signed ImageKit URL transformation (320px WebP). This leaves no permanent duplicate thumbnail object in the ImageKit Media Library. Video uploads keep an additional poster frame, which is a separate useful asset and not an image-upload duplicate. Local storage retains its local image thumbnails for compatibility.

The media download endpoint and signed-URL endpoint still check the current AEVORA media permissions before returning either image or thumbnail. Existing thumbnails are still served if their records reference a stored thumbnail. No existing ImageKit objects are removed automatically.

### Existing duplicate images

Old thumbnail files remain in ImageKit until they are safely removed after verifying signed transformations on the live account. Do not manually delete an old thumbnail if its MongoDB `thumbStorageFileId` is still referenced; first migrate the record and verify the replacement.

## Main files

| Area | File |
| --- | --- |
| Draft previews, Send button, retry | `client/src/features/social/messaging/ChatComposer.jsx` |
| File limits and type handling | `client/src/features/social/messaging/attachmentRules.js` |
| Typed image/video/file bubbles | `client/src/features/social/messaging/ChatMessage.jsx` |
| Optimistic sending & reconciliation | `client/src/features/social/pages/MessagesPage.jsx`, `client/src/features/social/messaging/messageCache.js` |
| Server message metadata, mixed kind, gallery | `server/src/social/messageRoutes.js`, `server/src/social/models.js` |
| Single-image storage decision | `server/src/media/thumbnailPolicy.js`, `server/src/media/processor.js` |
| Signed ImageKit thumbnail transformation | `server/src/storage/imagekit.js`, `server/src/media/routes.js` |
| Regression tests | `client/test/attachmentComposer.test.mjs`, `server/test/attachmentStorage.test.js` |

## Installation

Keep your existing `server/.env` (including `STORAGE_PROVIDER=imagekit`, `IMAGEKIT_PRIVATE_KEY`, and `IMAGEKIT_URL_ENDPOINT`) and `client/.env` where applicable. No new environment variables, dependencies, or destructive database migrations are required for this update. Extract the new full project to a separate folder and run `npm install` in both `server` and `client`, then restart both development processes.

## Manual acceptance checks

1. Select two images in a DM. Both appear in the composer, and **nothing new** appears in ImageKit until Send is clicked.
2. Remove one image and send the other with text. It creates one new optimized ImageKit image object, not a separate physical thumbnail. Check `GET /api/social/media/:id/file?thumb=1` renders a small preview after authentication.
3. Select a video, image and PDF together (up to four attachments). Verify each type renders correctly in the conversation and downloaded documents retain their original filenames.
4. Test images and attachments between two accounts. The recipient must receive the saved message once via Socket.IO, without an extra refresh.
5. Test Enter, Shift+Enter, Send button, empty composer, sending spinner, cancel/retry, multiple clicks, and the editing composer.
6. Check the existing messages, profiles, post images, community images, and saved media still load and respect authorization.
7. Confirm existing ImageKit records with saved thumbnail IDs still load. Do not delete those thumbnails until live signed transformation delivery is confirmed.

## Verification limits

Source syntax, import paths, and dependency-free regression tests are checked in this environment. The live ImageKit SDK, MongoDB, two-user browser flows, media transcoding, and a full Vite build require testing with installed dependencies and your own credentials. No actual ImageKit or MongoDB account was accessed to perform this update.
