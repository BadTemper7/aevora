# Aevora mobile messaging UX: follow-up revision (November 11, 2026)

This is a code update to the existing React/Vite Aevora project. Messaging APIs, existing data models, and persistence logic are not changed.

## Fixes in this revision

1. **Theme control restored:** The Messages page header always shows the light/dark theme toggle. On mobile, a compact menu in the same header gives access to Home, Communities, Messages, Explore, and all additional routes. The notification bell remains on tablet/desktop widths.
2. **No bottom navigation on Messages:** The mobile tab bar is not mounted under the conversation or inbox view. The Home layout retains its mobile navigation. The Communities layout was simplified in the subsequent community UI update; see `COMMUNITIES_MOBILE_UX_CHANGELOG.md`. The header menu is the mobile escape route from an open conversation.
3. **Reactions belong to the message bubble:** On touch devices, tap or press-and-hold the actual bubble to open its message reaction/actions toolbar. Tapping timestamps, delivery receipts, avatar, whitespace, or the rest of the message row no longer opens the toolbar. The desktop hover target is also limited to the bubble rather than the whole row. Reaction and emoji popovers continue to use the visible viewport for positioning.
4. **One-row chat composer:** One expandable `+` button on the left opens Attach, GIF, and Emoji. The text area sits in the middle. The selected conversation's default quick emoji/sticker is the only right-side button when there is no draft or attachment. As soon as there is typing or an attachment, it is replaced by Send. During editing it becomes Save. The tools and pickers close on outside tap or Escape; emoji and GIF overlays remain anchored to the always-visible `+` button.
5. **Previously delivered improvements retained:** New chats scroll to the most recent message, the Latest messages shortcut is available if scrolled up, image bubbles use a slim border, and text/timestamp contrast and touch targets remain improved.

## Files changed in this revision

- `client/src/layouts/MessageLayout.jsx`
- `client/src/layouts/main/MessageNavigationMenu.jsx` (new)
- `client/src/features/social/messaging/ChatMessage.jsx`
- `client/src/features/social/components/MessageActions.jsx`
- `client/src/features/social/messaging/ChatComposer.jsx`
- `client/test/mobileMessagingUx.test.mjs` (updated)
- `MOBILE_MESSAGING_UX_CHANGELOG.md`

## Checks completed

Run the project regression smoke checks:

```bash
cd aevora/client
node --test test/mobileMessagingUx.test.mjs
```

Result: 7/7 passed. All source JSX/JavaScript files and local relative imports were also parsed/checked (140 source files and 349 imports; no parser errors or missing relative imports).

**Full Vite production build is not verified in this environment.** The offline dependency install could not complete because the npm cache did not contain every package (first failure: `zustand-5.1.0.tgz`). On a development machine with network access, use a recent compatible Node 22 release and run:

```bash
cd aevora/client
npm ci
npm run build
npm run dev
```

Manual mobile QA at 320px, 375px, and 390px:

- Verify the moon/sun appearance button works and the header menu can navigate to Communities and back.
- Confirm that the bottom nav is absent from `/messages` and `/messages/:id`.
- Verify clicking the timestamp/blank message row does nothing, while tapping or long-pressing the message bubble opens reactions.
- Confirm sticker appears alone for empty draft; typing swaps it for Send; clearing swaps it back; selecting a file shows Send.
- Expand the `+` button, test file/GIF/emoji tools, and open the emoji picker while the keyboard is showing.
- Verify the latest-message scroll behavior and desktop hover reactions after refreshing.
