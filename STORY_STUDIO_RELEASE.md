# AEVORA Story Studio: 9:16 MP4 Timeline (implementation report)

This update extends the existing StoryEditor and StoryViewer. It does not replace the AEVORA homepage, messaging, authentication, notifications, social feed, ImageKit storage, or story rail.

## Implemented

- Fixed 9:16 vertical canvas in editor and published StoryViewer, including on desktop. Final encoded output is **1080 x 1920**, 24 FPS, H.264 video with AAC audio.
- **One timeline, maximum 60 seconds total**, with up to 10 clips, clips of at least 0.5 seconds. Both client and server reject excess length; legacy `/stories/batch` also checks the total.
- Add photos, video, animated GIF backgrounds, and text clips. Set per-clip duration, video trim start, speed (0.5x-2x), split, duplicate, delete, reorder by buttons or desktop drag/drop, and scrub the timeline.
- Cut and fade-through-black transitions; cinematic, monochrome, blur, glow/unsharp presets; background color, fit/crop, rotation and photo corrections. Fade and rise-in animations are supported for **overlay groups**, not individual keyframed elements.
- Reuses the existing story text, emoji, drawing, image sticker, and licensed uploaded-story-music controls. These render into the MP4; music has trim, volume, fades and source-video-audio mixing. Music selection continues to use the existing licensed/owned track library.
- Existing polls, question stickers, mentions, links, external GIF stickers and similar interactive elements are preserved in the **Interactive Slides** publishing mode. They are not silently baked into an MP4.
- IndexedDB autosaves an unfinished story (including File/Blob objects) for same-browser draft recovery. Undo/redo remain supported.
- A new MongoDB render-job queue validates media ownership and permissions before processing. One FFmpeg job at a time per API instance; data is not published until the MP4 has been rendered, probed, uploaded to ImageKit (or local development storage), and marked ready.
- A small poster/thumbnail is created for the MP4. Source uploads continue to use AEVORA's existing image/video validation, optimization, and malware checks. Output is encoded once with H.264/AAC. The final story still expires after 24 hours.
- Idempotent publish request IDs, progress/status polling, retries (up to three render attempts), and stale-job reclamation. The server never accepts file paths, remote URLs, or shell commands in its render API.

## Important limitations (not represented as complete)

- **Not a full CapCut replacement:** arbitrary per-element keyframes, speed curves, chroma key, complex xfade overlaps, automatic clip splitting, AI effects, waveform visualization, commercial music APIs, lyric licensing and collaborative draft edits are not implemented.
- Imported GIPHY stickers and interactive widgets cannot be baked into the rendered MP4. Use Interactive Slides for those. Imported GIFs used as *backgrounds* are converted to an animated GIF for FFmpeg and should preserve animation with compatible decoders.
- Effects in the browser use CSS and server encoding uses FFmpeg/Sharp, so fine typography, rendering/positioning, photo rotation and animations can differ slightly between preview and exported video. Pixel-identical export has **not** been established.
- Photo background blur is shown in the editor but is not part of the final server image processing yet. Avoid using it for final video exports where visual parity is required.
- Render Free's 512 MB instance and ephemeral disk can be insufficient for 60-second 1080x1920 renders. For reliable production rendering, provision a persistent background worker with adequate RAM/CPU/disk, and test under concurrency. Live ImageKit, MongoDB, 2-user playback and production rendering have NOT been tested in this environment.
- Drafts are stored in the current browser's IndexedDB, not synchronized between devices.
- New originals are temporarily optimized/stored by the existing media pipeline before the MP4 export; storage cleanup runs according to the existing AEVORA media retention policy.

## Modified existing files

- `client/src/features/social/feed/stories/StoryEditor.jsx`: enhanced editing workflow, timeline, draft recovery, video render status and publishing.
- `client/src/features/social/feed/stories/StoryCanvas.jsx`: preview overlay animations and effect presets, fixed ratio inherits host dimensions.
- `client/src/features/social/feed/stories/StoryViewer.jsx`: centered vertical viewer canvas on desktop/mobile.
- `server/src/social/storyRules.js`: 60-second limit for legacy story batch publication.
- `server/src/social/models.js`: render-job model and idempotent story reference.
- `server/src/app.js`: mounted existing authenticated social API plus new render endpoints.
- `server/src/server.js`: starts story render worker after database connects.
- `server/.env.example`: optional render settings.

## Added files

- `client/src/features/social/feed/stories/StoryTimeline.jsx`
- `client/src/features/social/feed/stories/storyTimeline.js`
- `client/src/features/social/feed/stories/storyDrafts.js`
- `client/test/storyTimeline.test.mjs`
- `server/src/social/storyStudioRules.js`
- `server/src/social/storyStudioRoutes.js`
- `server/src/social/storyStudioRenderer.js`

## API additions (session authenticated and rate-limited)

- `POST /api/social/stories/renders`: creates/idempotently reuses a render job. Requires `{ requestId, visibility, clips }`, ready media IDs belonging to the user, authorized music tracks, valid effects, and **total duration <=60 seconds**.
- `GET /api/social/stories/renders/:id`: owner-only status, progress, output media and story ID.
- `POST /api/social/stories/renders/:id/retry`: owner-only retry for a failed job with <3 attempts.
- Existing `/api/social/media`, `/api/social/media/:id/file`, `/api/social/stories` and `/api/social/stories/batch` continue to work.

## MongoDB change

New `social_story_render_jobs` collection with unique `{ownerId,requestId}` and `{status,createdAt}` queue indexes. Existing story records add optional `renderJobId` with a partial unique index. The application creates indexes using existing Mongoose model initialization; no destructive data migration is needed.

## Optional backend environment settings

```dotenv
STORY_RENDER_TIMEOUT_SEC=1200
STORY_RENDER_PRESET=ultrafast
STORY_RENDER_CRF=27
STORY_MAX_RENDER_MB=150
```

Requires `ffmpeg` and `ffprobe`, which are already installed in the project's Dockerfile. Keep existing Better Auth, MongoDB, ImageKit, LiveKit and GIPHY credentials. Do not commit the local `.env`.

## Validation performed

- 96 JSX files parsed with TypeScript JSX parser; all backend JS syntax checked using Node 22.
- 233 client/server source files inspected for relative import resolution; no missing paths.
- Five pure timeline regression tests passed.
- Synthetic FFmpeg rendering test passed for a 1-second photo and a trimmed/speed-adjusted source-video segment. Output verified by ffprobe as H.264 video (1080 x 1920) with AAC audio.
- No full npm install/build, browser playback, ImageKit upload or MongoDB integration test was possible in the execution environment. **Do not describe the full feature as production-tested.**

## Rollout plan

1. Extract to a new project copy, preserve `.env` secrets, then `npm install` in server and client.
2. Test with a 2-second photo story. Confirm the render job moves pending -> rendering -> uploading -> ready and the single generated story appears in the existing feed.
3. Confirm ImageKit contains the final MP4 and one poster image; private media must remain inaccessible to unrelated accounts.
4. Test a 2-video/1-photo 10-second story with trims, sound, and fade. Check 1080x1920 MP4 with H.264/AAC and viewer playback on desktop/mobile.
5. Test the 60-second cap on the client and via direct API calls. Confirm oversized/foreign media IDs are rejected.
6. Test interruption midway through rendering, retry, idempotency, and upload failures without publishing partial stories.
7. Measure peak memory, disk and render latency on the Render plan you use. Consider a dedicated render worker if large exports fail on the free tier.
