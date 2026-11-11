# AEVORA R2 verification report

Date: 2026-11-10

## Completed local checks

- Code based on the notification-dropdown update from the user's latest uploaded AEVORA project, with no edits to theme, navigation, message layout or feed design.
- Backend `.js` syntax verified with Node.js 22 (`node --check`).
- Frontend `.js/.jsx` source parsed via TypeScript JSX parser; relative imports checked.
- Pure-policy tests cover resizes, image format selection, metrics, message/media authorization source integration, optimized-before-ready ordering, tenant-scoped deduplication, and scanner fail-closed behavior.
- FFmpeg command smoke test completed on generated video. Output: H.264, 1280×720, 373,435 bytes from 1,993,755-byte source (81.27% reduction). This is a synthetic test only and is not representative of all uploads.
- Base server tests which require installed dependencies were not runnable here due npm DNS failure. They must be run after `npm install` on the user's machine.

## Not completed here

- npm installation and full browser build (registry lookup `EAI_AGAIN`).
- Live R2 PutObject, HeadObject, signed URLs, private object streaming/ranges or cleanup with real credentials.
- Live MongoDB model/index creation, authorization across two users, and migration/rollback against a real existing data set.
- Sharp/GIF conversion end-to-end, ClamAV scanner with a running daemon, media quota concurrency and load testing.
- Full video playback in browsers and mobile devices.

The code is an integrated implementation for local testing. **Do not deploy directly to production without these acceptance tests and a security review.**
