# Aevora Communities mobile layout cleanup (November 11, 2026)

This revision builds on the previously supplied full project with the refined mobile messaging interface. It changes client presentation only; existing community APIs, data, authentication, channel and voice behavior remain intact.

## What changed

- **Both Community screens:** Removed the back-arrow header shortcut and the Discover/Friends/Home icon shortcuts. The AEVORA logo (links to Home) and the light/dark theme control remain.
- **Both Community screens:** Removed the shared mobile bottom navigation bar from the Community layout. The chat inside a community uses the extra vertical space.
- **Discovery screen:** Removed the large empty bottom padding that had previously made room for the mobile nav.
- **Community detail:** Placed Spaces, Events, Invites, and Settings in their own full-width, equal four-column row. Labels are below their icons on mobile, avoiding the truncated Settings button. On larger screens icons and labels sit side-by-side. All four buttons retain a 48px minimum height and are still clickable.
- **Community detail header:** Allowed the community name to truncate cleanly beside the member button on narrow devices.

## Files updated

- `client/src/layouts/CommunityLayout.jsx`
- `client/src/features/communities/pages/CommunityDiscoveryPage.jsx`
- `client/src/features/communities/pages/CommunityPage.jsx`
- `client/test/communityContracts.test.mjs` (new, used by the existing `npm run test:communities` script)
- `client/test/mobileMessagingUx.test.mjs` (updated expectation for no community bottom bar)
- `MOBILE_MESSAGING_UX_CHANGELOG.md` (clarifying follow-up note)
- `COMMUNITIES_MOBILE_UX_CHANGELOG.md` (this file)

## Checks

From `aevora/client`:

```bash
node --test test/communityContracts.test.mjs test/mobileMessagingUx.test.mjs
```

Also check both the light and dark themes at 320px, 375px and 390px widths, including channel scrolling and on-screen keyboard behavior. The full Vite build requires local dependencies (`npm ci && npm run build`).
