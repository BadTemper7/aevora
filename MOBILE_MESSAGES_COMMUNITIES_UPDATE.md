# AEVORA Mobile Messages & Communities Update

## Scope

Based on the latest Story Studio deployment-ready AEVORA project. Existing authentication, social and community API endpoints, MongoDB collections, ImageKit integration, GIPHY configuration, LiveKit token routes, the Story Studio editor, and the home/feed UI have not been replaced.

## User-facing changes

- **Dedicated headers:** Messages and Communities now use one `CommunicationHeader` with the clickable AEVORA logo (Home) and only the theme toggle on the right. The redundant Home arrow, Home icon, community Discover/Friends/Home header nav, and notification bell in these two page headers have been removed. A context-specific back-to-conversations arrow inside an open chat remains because it returns to the chat list, not Home.
- **Mobile chat input:** The text input takes a full-width first row at phone widths. Attachment, GIF, emoji, quick reaction and Send actions appear on the second row. Desktop retains a compact inline layout. Textarea autogrowth, editing, previews, uploads and keyboard send remain in place.
- **Message header:** Removed the extra search icon. Search remains available from Chat Details, using its existing action.
- **Mobile communities:** All four sections (Spaces, Events, Invites, Settings) remain visible in a compact four-column icon/label grid. At larger widths the existing horizontal tab styling returns. Community header and member avatars shrink on small screens. Channel list continues to open as an accessible mobile drawer.
- **Voice overlay:** When the voice panel is minimized on mobile, it occupies normal layout space instead of covering the chat composer. Expanding it still opens the voice panel; desktop retains its floating dock.
- **Audio settings:** The existing LiveKit voice settings button now exposes toggles for the browser's `noiseSuppression`, `echoCancellation` and `autoGainControl` media constraints. Settings are saved in localStorage on that device and applied to the active audio track (when present), as well as to future microphone capture. Browser support and effectiveness vary. This is WebRTC noise suppression, **not a paid or AI noise-cancellation service**.
- **Community attachment submission:** The shared composer now passes staged files, text, reply ID and client ID to the existing community message handler. An HTTP send failure propagates back to the composer so it can retain the draft for retry.
- **GIF picker:** Uses a narrow-screen fixed viewport panel so the picker does not extend offscreen when the composer is two rows tall.

## Updated or added files

- `client/src/layouts/MessageLayout.jsx`
- `client/src/layouts/CommunityLayout.jsx`
- `client/src/layouts/CommunicationHeader.jsx` (new)
- `client/src/features/social/pages/MessagesPage.jsx`
- `client/src/features/social/messaging/ChatComposer.jsx`
- `client/src/features/social/messaging/GifPicker.jsx`
- `client/src/features/communities/pages/CommunityPage.jsx`
- `client/src/features/communities/components/VoiceDock.jsx`
- `client/src/features/communities/components/audioSettings.js` (new)
- `client/src/features/communities/components/ChannelChat.jsx`
- `client/test/mobileCommunication.test.mjs` (new)
- `client/package.json` (adds `npm run test:mobile`)

**Backend changes:** None. **New environment variables:** None. **Database migration:** None. Existing LiveKit configuration is still required for voice connections.

## Local checks performed

- Node/TypeScript source parser: 235 frontend + backend `.jsx`, `.js`, and `.mjs` files checked, zero syntax errors.
- Relative imports checked, zero unresolved paths.
- 13 dependency-free automated tests passed (`npm run test:mobile`), covering mobile contracts, shared headers, audio processing settings, and the pre-existing Story Studio timeline.
- A complete Vite build and device/browser interaction test could not be run here, since npm offline install was missing a cached dependency. **Do not treat responsive behavior or live microphone processing as browser-verified until tested on devices.**

## Manual acceptance plan

1. Test at 320, 360, 375, 390, 430, 768, 1024, and 1440 px widths; in both dark and light themes.
2. On mobile Messages, open inbox, then a direct chat. The composer must be full width. The in-chat back arrow must return to the inbox. The logo must go Home.
3. Send text, attach a photo/video, use GIF and emoji, edit a message, and rotate between portrait and landscape. Verify the composer remains accessible with the software keyboard visible.
4. On `/communities/:id`, access Spaces, Events, Invites and Settings. Open/close the channel drawer and member list on a narrow screen.
5. Join LiveKit voice with two test accounts. Minimize the dock on a phone and confirm the text composer stays usable. Expand it, open the audio input settings, toggle noise suppression, and verify microphone sending/receiving is unaffected by switching text channels.
6. Test with Chrome, Brave, and mobile Safari if available. Some WebRTC audio constraints may be unsupported; the browser can silently ignore them.
7. Verify no regressions in login, friends, stories, messages, ImageKit images, GIPHY, and theme toggling after Render deployment.

## Deploy

Copy the contents of this archive into the existing GitHub-connected project, preserving local `.git` and private `.env` files. Commit and push to `main`. Render should rebuild if automatic deployment is enabled. No new service credentials are necessary.
