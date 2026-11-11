# Latest Client Preservation Audit

Base: user-uploaded aevora.zip (November 10, 2026).

## Changed files
- client/package.json
- client/src/app/config/navigation.js
- client/src/app/config/routes.js
- client/src/app/router.jsx
- client/src/features/communities/pages/CommunityDiscoveryPage.jsx
- client/src/features/communities/pages/CommunityPage.jsx
- client/src/features/social/hooks/useRealtime.js
- client/src/features/social/pages/FriendsPage.jsx
- client/src/layouts/main/MobileNav.jsx
- client/src/layouts/main/SidebarNav.jsx
- client/src/layouts/main/Topbar.jsx
- client/src/layouts/MessageLayout.jsx
- client/test/communityContracts.test.mjs
- client/test/messagingUx.test.mjs
- client/test/socialRegression.test.mjs
- server/src/communities/channelRoutes.js
- server/src/communities/communityRoutes.js
- server/src/communities/eventRoutes.js
- server/src/communities/events.js
- server/src/social/messageRoutes.js
- server/src/social/models.js
- server/src/social/notificationRoutes.js
- server/src/social/notify.js
- server/src/social/peopleRoutes.js
- server/test/chatContracts.test.js

## New files
- NOTIFICATIONS_RELEASE_NOTES.md
- server/test/notificationPolicy.test.js
- server/test/notificationSourceContracts.test.js
- server/src/social/notificationPolicy.js
- server/src/social/unreadSummary.js
- client/test/notificationDropdown.test.mjs
- client/src/features/social/notifications/NotificationBell.jsx
- client/src/features/social/notifications/notificationHelpers.js
- client/src/features/social/hooks/useUnreadIndicators.js

## Removed files
- client/src/features/social/pages/NotificationsPage.jsx

## Key design files preserved byte for byte
- client/src/styles/index.css
- client/src/styles/theme.css
- client/src/features/social/feed/pages/HomePage.jsx
- client/src/features/social/feed/components/StoryRail.jsx
- client/src/layouts/CommunityLayout.jsx
- client/src/features/social/pages/MessagesPage.jsx

Navigation/bell, badges, and read-position behavior were modified only where needed by the request.
