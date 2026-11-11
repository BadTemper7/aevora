# AEVORA Notification Dropdown + Message Unread Tracking

**Source:** The `aevora.zip` uploaded on November 10, 2026. This update is a targeted patch on that copy. Home feed, stories, communities UI, chat, theme and auth layouts were not restored from earlier releases.

## Changed files (client)

- `client/src/features/social/notifications/NotificationBell.jsx` **new**: responsive bell dropdown, 20-notification infinite pages, a scroll-root IntersectionObserver, deduplication, loading/error/retry, user avatars, relative times, keyboard/outside closure, read and read-all, optional-notification preferences.
- `client/src/features/social/notifications/notificationHelpers.js` **new**: notification destinations, deduplication, and relative-time formatting.
- `client/src/features/social/hooks/useUnreadIndicators.js` **new**: query hooks for conversation and community unread counts, separate from bell state.
- `client/src/layouts/main/Topbar.jsx`: replaces the notification page link with the reusable bell dropdown, preserving the topbar's styles and other actions.
- `client/src/layouts/MessageLayout.jsx`: uses the same dropdown in the existing Messenger header.
- `client/src/layouts/main/SidebarNav.jsx`: removes the Notifications link; adds message and community unread badges.
- `client/src/layouts/main/MobileNav.jsx`: shows the existing Messages tab's unread badge.
- `client/src/features/social/hooks/useRealtime.js`: updates bell/read caches and unread counters in response to authenticated socket events. New notifications update the first cached page without refetching the full infinite history.
- `client/src/features/social/pages/FriendsPage.jsx`: honors `?tab=received` from actionable notifications, keeping the existing design.
- `client/src/features/communities/pages/CommunityDiscoveryPage.jsx`: adds an anchor to the existing Community invitations section.
- `client/src/features/communities/pages/CommunityPage.jsx`: removes 30-second unread polling in favor of authenticated socket events and saved read positions.
- `client/src/app/router.jsx`, `client/src/app/config/routes.js`, `client/src/app/config/navigation.js`: remove the dedicated Notifications page and navigation path.
- **Removed:** `client/src/features/social/pages/NotificationsPage.jsx`.
- `client/test/notificationDropdown.test.mjs` **new**. Older source tests were adjusted to expect the dropdown and accept formatting changes already present in the uploaded client. `client/package.json` includes `npm run test:notifications`.

## Changed files (server)

- `server/src/social/notificationPolicy.js` **new**: strict default bell allowlist. Friend requests/acceptance, community invitations/membership/important access updates, account and moderation security events and joined event reminders are allowed. Follows, posts, reactions, mentions and announcements require explicit category opt-in. Unknown types, DMs, group chat messages, requests, reactions and delivery events are blocked from the bell.
- `server/src/social/notify.js`: central enforcement, optional preferences, idempotent accepted-friend grouping by recipient/date, socket updates.
- `server/src/social/notificationRoutes.js`: cursor pages, unread summary, read/read-all/delete, opt-in category preferences. Historical message notifications remain stored but are never returned or counted.
- `server/src/social/models.js`: indexes for notification feed/group/reading, grouping metadata and `enabledCategories`. No destructive migration.
- `server/src/social/messageRoutes.js`: removes all ordinary message, group invite, reaction and message-request bell writes; adds independent conversation unread summary backed by persisted read cursors.
- `server/src/social/unreadSummary.js` **new**: indexed MongoDB aggregation for unread message totals, excluding own/blocked/deleted/expired messages.
- `server/src/social/peopleRoutes.js`: supplies actor name for friend-acceptance aggregation.
- `server/src/communities/communityRoutes.js`: permission-aware summary of unread community channels; emits important access alerts when roles change and members are removed/banned or ownership transfers.
- `server/src/communities/channelRoutes.js`: emits lightweight activity updates after a persisted channel message, emits per-user read-position updates, preserving channel access authorization.
- `server/src/communities/events.js`: joins authenticated active members to community activity rooms to update navigation badges outside community pages. Message content remains restricted to separately authorized channel rooms.
- `server/src/communities/eventRoutes.js`: event reminders link to the correct community.
- `server/test/notificationPolicy.test.js`, `server/test/notificationSourceContracts.test.js` **new**; `server/test/chatContracts.test.js` updated for deliberate removal of chat notification writes.

## New and updated endpoints

All protected by existing Better Auth sessions and existing rate limit / origin middleware.

- `GET /api/social/notifications/unread-count` -> `{ unread }` (important + opted-in events only).
- `GET /api/social/notifications?limit=20&before=<id>` -> `{ items, unread, nextCursor }` (newest first, stable `_id` cursor; fetches one extra item to determine if another page exists).
- `PATCH /api/social/notifications/:id/read`, `POST /api/social/notifications/read-all`, `DELETE /api/social/notifications/:id` remain available.
- `GET /api/social/notification-preferences`, `PATCH /api/social/notification-preferences` now include `enabledCategories`: `social`, `content`, `mentions`, `announcements` (all off by default).
- `GET /api/social/conversations/unread-count` -> `{ unread, conversations }`.
- `GET /api/communities/unread-summary` -> `{ total, communities: { <communityId>: count } }`.
- Existing `POST /api/social/conversations/:id/read` and `POST /api/channels/:channelId/read` still persist read positions independently of bell notifications.

Socket.IO events: existing `notification:new` plus `notification:updated`, `community:message:activity`, `community:unread:updated`; existing message/new/updated/receipt events remain unchanged. No ordinary chat bell or browser push notifications are sent.

## Database changes / migration

Mongoose automatically registers the new non-destructive indexes when index creation is enabled. In databases with automatic index creation disabled, create the new indexes as part of your deployment plan after reviewing old indexes and existing group data:

```
db.social_notifications.createIndex({userId:1,_id:-1})
db.social_notifications.createIndex({userId:1,readAt:1,_id:-1})
db.social_notifications.createIndex({userId:1,groupKey:1},{unique:true,partialFilterExpression:{groupKey:{$type:"string"}}})
```

New optional fields: `social_notifications.groupKey`, `.groupCount`, `.groupLeadName`, `.actorIds`, `.dedupeKeys`, `.lastEventAt`, `.url`; `social_notification_prefs.enabledCategories`. Existing unread message cursors remain valid. **Do not delete historical notifications or conversations just to update the UI.**

## Deployment and testing

Backend: `cd server && npm install && npm run dev` (use existing MongoDB credentials).
Frontend: `cd client && npm install && npm run dev`. No new npm packages or environment variables are introduced.

Automated source tests: `node --test client/test/*.test.mjs` and `node --test server/test/notificationPolicy.test.js server/test/notificationSourceContracts.test.js server/test/chatContracts.test.js` from the project root.

Manual verification using two separate accounts:

1. Request a friendship and accept it. The bell receives the actionable notification; the click leads to the correct Friends tab.
2. Send ordinary DM/group/community messages. The notification collection's record count must **not** increase. Messages and channel unread indicators should increase for eligible recipients and clear on read.
3. Open the bell with 20+ notification records and scroll. Confirm a cursor page is added, no duplicate IDs or scroll jumps, and that loading stops when `nextCursor` is null.
4. Mark one and all read. Confirm bell count and UI update in both browser sessions without a refresh.
5. Send a community invitation, approve or deny a join request, remove or ban a member. Verify only authorized recipients see the relevant alerts.
6. Enable optional `mentions`, then trigger a community mention; disable it and verify no additional mention bell record is written.
7. Check mobile and both themes, Escape/outside-click closure, network retry, and the original home/story/chat/community layouts.

**Verification limits:** The source was parsed and source/pure-function tests were run. A full dependency install/build and live MongoDB, WebSocket and two-account browser testing could not be completed in this environment; these must pass on your configured AEVORA deployment before production release. Browser push alerts for security changes and Better Auth password-change audit hooks are not newly implemented by this patch; their notification event categories are reserved for secure backend producers.
