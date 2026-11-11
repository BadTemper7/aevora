# AEVORA Stories upgrade (November 10, 2026)

## Starting point and preservation

This project extends the **existing** homepage story rail, MongoDB story records, authenticated `/api/social` endpoints, and shared ImageKit media pipeline. It does not introduce a separate account system, replace the homepage, or add an independent media storage provider. The new editor and viewer render as fullscreen overlays when opened from the existing story rail.

## Available editor and viewer interactions

- Story types: photo, video, animated GIF, and text-only backgrounds. Up to **10 slides** per batch, published together after all uploads are processed.
- Source selection: file picker, drag/drop onto the editor, camera photo, and MediaRecorder video capture (where supported). Camera use requires explicit browser permission.
- Editor: portrait 9:16 canvas, fit/fill, blurred photo background, background color, brightness, contrast, saturation, rotation, zoom, position adjustments, text overlays, movable emoji/GIF/image stickers, brush strokes with selectable color/width, undo/redo, slide order, and audience (`public`, `friends`, `followers`). Canvas uses normalized x/y coordinates for viewer consistency.
- Video: choose a trim start and end, up to **60 seconds per published slide**. The existing FFmpeg worker trims/transcodes **before uploading** to ImageKit. Longer videos can be manually trimmed, but automated splitting into sequential clips is not included.
- Music: authenticated catalog of original and permission-attested licensed uploads, browse/search/favorite/recent, track preview, excerpt start time and duration, adjustable music/original audio volume, fade parameters, music-sticker display and drag placement. Image/video stories can have a single chosen music excerpt. The viewer plays the authorized music alongside the media; it does not permanently mix music into the video file.
- Audio library: user uploads audio (MP3, M4A, WAV, OGG, AAC where detected), supplies title/artist/genre/mood, sets public/private, and attests to synchronization/reproduction/distribution rights. Worker validates duration (default max 600s), converts to AAC M4A when beneficial, and then uploads only the selected result. Uploaded artwork uses the existing image pipeline.
- Sticker interactions: emoji, GIPHY GIF, user mention (permission checked), poll (one response/user), private question response to the story owner, emoji slider, countdown with reminder, link (HTTPS only), location label, Add Yours prompts, and optimized user-uploaded image stickers. Countdown reminders use an idempotent database claim and the existing important-notification system.
- Viewer: autoplay per-slide progress, next/previous controls, pause, opt-in sound, sticker interactions and results, viewed state, story removal by owner, and 24-hour expiry. Access checks reuse friendship/follow/block and privacy rules.

### Known constraints

- There is **no commercial music catalog** (e.g. Spotify/YouTube) or licensed lyric synchronization. A rights confirmation checkbox is only an assertion; staff must have a procedure for catalog moderation and takedown requests before offering music uploads publicly.
- Image sticker upload does not automatically cut out the image background. Transparent PNG/WebP works for manual cutouts.
- Animated audio-visual music indicators are simple UI effects. Automatic beat matching, professional audio mixing/rendering, advanced video splitting, and true camera photo filters are outside this release.
- The media worker can optimize and trim video but does not render all visual story overlays into a single flattened export; overlays are stored as structured metadata and rendered by AEVORA's viewer.
- Live ImageKit, MongoDB, real browser camera capture, multi-account story interaction, and full dependency-based Vite builds must be tested in the deployment environment. Source/regression tests alone are not end-to-end certification.

## Main added files

| File | Purpose |
| --- | --- |
| `client/src/features/social/feed/stories/StoryEditor.jsx` | Fullscreen slide editor, capture, overlays, music selection, preview and batch publication |
| `client/src/features/social/feed/stories/StoryMusicPicker.jsx` | Music catalog, track upload, rights confirmation, excerpt selection |
| `client/src/features/social/feed/stories/StoryCanvas.jsx` | Shared 9:16 editor/viewer rendering and sticker interactivity |
| `client/src/features/social/feed/stories/StoryViewer.jsx` | Slide playback, sound, read tracking, sticker actions |
| `server/src/social/storyRoutes.js` | Authenticated Story and music APIs, permissions, publication, interactions |
| `server/src/social/storyRules.js` | Bounded Zod validation for slides, overlays, audio, interactions |
| `server/src/social/storyReminders.js` | Optional important countdown reminders, idempotent per user |
| `client/test/storyEditorContracts.test.mjs` | Client story integration checks |
| `server/test/storyContracts.test.js` | Server source/authorization/processing contract checks |

## Existing modified files

| File | Change |
| --- | --- |
| `client/src/features/social/feed/components/StoryRail.jsx` | Keep its existing visual classes; opens editor and viewer, groups uploaded slides |
| `client/src/features/social/api/socialApi.js` | Reuse shared upload with video trim metadata |
| `client/test/socialRegression.test.mjs` | Update old story-route contract for the modular routes |
| `server/src/app.js` | Mount story routes; scoped 256 KB JSON parser for large multi-slide metadata batches |
| `server/src/server.js` | Start periodic countdown reminder worker |
| `server/src/social/models.js` | Extend existing story/media records; add authorized music and sticker response collections |
| `server/src/social/feedRoutes.js` | Remove duplicate old story endpoints, keep existing post endpoints |
| `server/src/social/notificationPolicy.js` | Allow story countdown reminder as an important bell event |
| `server/src/media/routes.js` | Authenticated audio uploads and streaming, story clip metadata, story/music/sticker attachment authorization and safe-delete guards |
| `server/src/media/processor.js` | Audio encode, server video trim, reference-preserving cleanup |
| `server/src/media/policy.js` | Optimized audio MIME mapping |
| `server/src/storage/imagekitPaths.js` | Private music audio object prefix |

## API additions and behavior

All below require existing Better Auth sessions and follow the existing response wrapper.

| Method and route | Description |
| --- | --- |
| `GET /api/social/stories` | All active stories visible to the current user, including slide/effects/layer/music metadata |
| `POST /api/social/stories/batch` | Validate and publish 1-10 slides after uploads reach `ready` status |
| `POST /api/social/stories` | Backward-compatible single-story media publish |
| `POST /api/social/stories/:id/view` | Idempotent view tracking |
| `DELETE /api/social/stories/:id` | Delete own story and responses |
| `GET /api/social/stories/:id/sticker-results` | Authorized poll/slider results and owner-only question answers |
| `POST /api/social/stories/:id/stickers/:stickerId/respond` | Vote, answer, react, or set countdown reminder |
| `GET /api/social/story-music?category=trending&q=...` | Search authorized original/licensed tracks |
| `POST /api/social/story-music` | Add validated, processed owned track to catalog after rights attestation |
| `POST /api/social/story-music/:id/favorite` | Toggle favorite |
| Existing `POST /api/social/media` | Adds `purpose=story_audio`, `clipStart` and `clipEnd` for story video clips |

## MongoDB changes and indexes

Existing `social_stories` adds `mediaKind`, `duration`, `effects`, `layers`, `music`, `groupId`, `slideIndex`, `promptSource`; expires via existing TTL `expiresAt` (24h). Existing `social_media` supports `kind=audio` and `purpose=story_audio`, plus story video trim metadata. New collections: `social_story_music` (unique mediaId), `social_story_music_favorites` (unique userId/trackId), and `social_story_sticker_responses` (unique storyId/stickerId/userId, TTL expiresAt, reminder query index). Existing `social_story_views` remains intact. New index builds normally via Mongoose model startup/index sync configuration; ensure the database migration/deployment process builds required indexes and check for conflicts.

No existing stories are destroyed. Existing records without layers or music remain readable with fallback properties.

## Environment and setup

Copy `server/.env.example` to `server/.env` (or merge changes with your current values). Keep **existing** Better Auth, MongoDB, ImageKit and optional LiveKit credentials. Video processing requires FFmpeg and FFprobe on the backend path.

Optional setting in `server/.env`:

```dotenv
MAX_STORY_TRACK_DURATION_SEC=600
# Existing values also apply:
MAX_VIDEO_MB=150
MAX_MEDIA_DURATION_SEC=600
FFMPEG_PATH=ffmpeg
FFPROBE_PATH=ffprobe
STORAGE_PROVIDER=imagekit
```

Existing audio uploads use a 15 MB limit. Public music should have an approval/takedown workflow. No new frontend secret, third-party music API key or database reset is required. `client/.env` GIPHY key is only needed for online GIF sticker search using the existing GIPHY provider.

Run:

```bash
cd server && npm install && npm run dev
# In another terminal:
cd client && npm install && npm run dev
```

To run available regression suites:

```bash
cd client && npm test -- --run # if configured; otherwise: node --test test/*.mjs
cd server && node --test test/storyContracts.test.js test/mediaOptimizationPolicy.test.js test/attachmentStorage.test.js test/imagekitStorageContract.test.js test/notificationPolicy.test.js
```

See `STORIES_TEST_PLAN.md` for manual acceptance and media checks.
