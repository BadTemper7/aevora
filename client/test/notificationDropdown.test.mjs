import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { notificationDestination, relativeNotificationTime, uniqueNotifications } from '../src/features/social/notifications/notificationHelpers.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const code = file => readFileSync(path.join(root, file), 'utf8');

test('notifications live only in the bell, never a separate route or sidebar link', () => {
  const router = code('client/src/app/router.jsx');
  const routes = code('client/src/app/config/routes.js');
  const nav = code('client/src/app/config/navigation.js');
  assert.doesNotMatch(router, /NotificationsPage|ROUTES\.notifications/);
  assert.doesNotMatch(routes, /notifications:/);
  assert.doesNotMatch(nav, /label: ['"]Notifications['"]/);
  assert.equal(existsSync(path.join(root, 'client/src/features/social/pages/NotificationsPage.jsx')), false);
  assert.match(code('client/src/layouts/main/Topbar.jsx'), /<NotificationBell\s*\/>/);
  assert.match(code('client/src/layouts/MessageLayout.jsx'), /<NotificationBell\s*\/>/);
});
test('cursor list loads 20 at a time on open, with real IntersectionObserver and no interval', () => {
  const bell = code('client/src/features/social/notifications/NotificationBell.jsx');
  assert.match(bell, /useInfiniteQuery/);
  assert.match(bell, /enabled: open/);
  assert.match(bell, /limit: 20/);
  assert.match(bell, /initialPageParam: null/);
  assert.match(bell, /getNextPageParam/);
  assert.match(bell, /IntersectionObserver/);
  assert.match(bell, /root: scrollRef.current/);
  assert.doesNotMatch(bell, /refetchInterval/);
  assert.match(bell, /Mark all as read/);
  assert.match(bell, /aria-expanded/);
});
test('duplicate notification ids across cursor pages are removed without changing order', () => {
  const rows = uniqueNotifications([{items:[{_id:'1'},{_id:'2'}]},{items:[{_id:'2'},{_id:'3'}]}]);
  assert.deepEqual(rows.map(row => row._id), ['1','2','3']);
});
test('notification clicks open relevant existing routes, never the removed page', () => {
  assert.equal(notificationDestination({type:'friend_request'}), '/friends?tab=received');
  assert.equal(notificationDestination({type:'community_invite'}), '/communities#invitations');
  assert.equal(notificationDestination({type:'community_join_response',entityId:'abc'}),'/communities/abc');
  assert.equal(notificationDestination({type:'community_event_reminder',url:'/communities/123'}),'/communities/123');
  assert.equal(notificationDestination({type:'account_security'}),'/privacy-safety');
  assert.equal(notificationDestination({type:'friend_request',url:'//evil.example'}),'/friends?tab=received');
  assert.equal(relativeNotificationTime('invalid'),'');
});
test('message unread indicators are not bell notifications', () => {
  assert.match(code('client/src/features/social/hooks/useUnreadIndicators.js'), /conversations\/unread-count/);
  assert.match(code('client/src/features/social/hooks/useUnreadIndicators.js'), /communities\/unread-summary/);
  const nav=code('client/src/layouts/main/SidebarNav.jsx');
  assert.match(nav,/useMessageUnread/);
  assert.match(nav,/useCommunityUnread/);
  assert.match(code('client/src/features/social/hooks/useRealtime.js'), /community:message:activity/);
});
