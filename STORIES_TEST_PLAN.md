# Story feature acceptance test

Test with two logged-in users in independent browser sessions and a working MongoDB + ImageKit backend. Do not use copyrighted commercial music without the right to synchronize and distribute it.

1. Sign in with Account A, open **Add story** on the existing homepage rail. Confirm the unchanged homepage and main navigation.
2. Create a text-only story, customize the background and text, choose Public, preview, and publish. Refresh. Verify it is still visible.
3. Upload a portrait photo; crop/zoom/rotate, change contrast/saturation, choose a 5/10/15-second duration, add/move text, draw with two colors/widths, Undo/Redo, and publish. Check ImageKit contains the optimized asset rather than an unnecessary duplicate original.
4. Add 2–3 consecutive slides. Publish once and confirm correct order and progress timing.
5. Record a photo and short video through browser permissions. Deny camera access once and confirm a helpful error. On a separate test upload, trim a video and verify the processed ImageKit MP4 duration and poster image.
6. Upload **original audio only** through Music. Confirm title/artist/mood/genre, preview, start the clip at a nonzero time, select 15 seconds, adjust volumes and fades, move and hide the music sticker. Verify the viewer plays the chosen section when sound is enabled. Verify the track remains accessible only under the intended sharing rules.
7. Add poll, question, emoji slider and countdown stickers. From Account B vote/respond/set a reminder. Check duplicates are blocked and only Account A receives private question responses. Confirm countdown reminder (wait until its scheduled time or use the local worker test setup).
8. Add a mention of Account B; set Account B's mention privacy to deny mentions and verify the publish request is rejected. Repeat with permission enabled. Check profile link and block restrictions.
9. Add a GIPHY sticker (with configured GIPHY integration), a custom transparent image sticker and an HTTPS link. Confirm animated GIF and media playback; reject invalid link schemes.
10. Test Add Yours by responding from Account B. Verify new stories are linked to the original prompt and obey configured audience permissions.
11. Verify private/friends/followers audiences from Account B and an unrelated Account C. Check that blocked accounts cannot retrieve the story **or its ImageKit media URLs**.
12. Delete one story slide, check viewer progression, media-delete safety (active audio and stickers cannot be deleted), and recheck after refresh.
13. Confirm stories expire from the feed and become inaccessible after 24 hours; inspect MongoDB TTL cleanup after its background expiry sweep.
14. Simulate a media worker failure. Publishing should not complete, the editor should show an error, and existing story posts should remain unchanged. Retry after restoring the worker.
15. Verify the 9:16 editor and story viewer on desktop, narrow mobile viewport, keyboard navigation, touch, and light/dark modes. Check long sticker text is clipped appropriately and safe areas remain readable.
16. Confirm existing DM attachments, posts, friends, communities, notifications and video uploads work without regression.

## Static verification available in the authoring environment

- JS/JSX parsing and relative import resolution without a full dependency install.
- Client tests via `node --test client/test/*.mjs`.
- Selected server dependency-free tests via `node --test` for the specified files.
- FFmpeg smoke tests with synthetic sample media only.

These do not prove a successful live Google login, ImageKit upload, licensed audio access, browser recording, database transactions, or multi-account real-time synchronization. Those require manual deployment-environment acceptance tests.
