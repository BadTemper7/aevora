# Aevora mobile messaging UX updates

This package updates the existing Vite/React app. Server APIs and persistence are unchanged.

## Changes

- The mobile tab bar is now available from the feed, full-screen Messages and Communities. Tabs: Home, Communities, Create, Messages and More. The More menu exposes Explore, Friends, Short videos, Subscriptions, Gaming, Profile, Privacy & Safety, Settings, Company, Calendar, Tasks and Help, plus the theme selector.
- Opening a conversation scrolls to the newest message after virtual rows mount. An initial two-frame correction and resize anchoring handle delayed media measurements. Scrolling up does not force the reader back down; a Latest messages button returns to the bottom.
- Emoji, GIF and reaction popovers are placed through portals and clamped to the current visual viewport, taking mobile virtual keyboards into account.
- Reaction controls no longer show a persistent floating smiley on touch devices. Tap or long-press a bubble, or use keyboard focus, to show them.
- Message media-only bubbles now use a narrow neutral frame instead of heavy blue padding. Timestamps sit below the bubble, in higher contrast text; bubble spacing is tighter.
- Chat header has a padded 40px back target, consistent outline icons, and an online dot when presence is visible. Global appearance controls are available from More instead of a floating moon on the mobile Messages header.
- Composer now has a full-width text entry row and a separated 44px icon/action row. Its input border has stronger contrast and its send button is no larger than other primary actions.
- Voice chat dock is shifted above mobile navigation in Communities.

## Tests

Run static/logic smoke tests without external packages:

```bash
cd aevora/client
node --test test/mobileMessagingUx.test.mjs
```

For the full integration check on your development machine (with npm dependencies and a supported Node release):

```bash
cd aevora/client
npm ci
npm run build
npm run dev
```

Then test at narrow widths (320px, 375px, 390px): open /messages, select a conversation, confirm it opens at the last message, scroll up, return to Latest, open an emoji picker while the keyboard is up, tap and long-press message bubbles, open GIFs and navigate through Communities and More. Check both light/dark themes and voice chat if used.

Note: placeholder routes such as Gaming, Company, Calendar and Tasks retain their pre-existing placeholder pages; this update exposes navigation to them but does not implement those features.
