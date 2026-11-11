import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readSource = (file) => readFileSync(path.join(root, file), "utf8");

test("notifications now use a dropdown with separate summary and infinite-query cache keys", () => {
  const bell = readSource("client/src/features/social/notifications/NotificationBell.jsx");
  const topbar = readSource("client/src/layouts/main/Topbar.jsx");
  assert.match(bell, /\['notifications', 'feed'\]/);
  assert.match(bell, /\['notifications', 'summary'\]/);
  assert.match(bell, /initialPageParam: null/);
  assert.match(topbar, /<NotificationBell \/>/);
});

test("messenger uses its own layout and provides home navigation", () => {
  const router = readSource("client/src/app/router.jsx");
  const shell = readSource("client/src/layouts/MessageLayout.jsx");
  assert.match(router, /element:\s*<MessageLayout\s*\/>/);
  assert.match(shell, /aria-label="Back to home"/);
  assert.match(shell, /<Outlet\s*\/>/);
});

test("friend management remains available after replacing message tabs with a filter menu", () => {
  const page = readSource("client/src/features/social/pages/MessagesPage.jsx");
  const people = readSource("server/src/social/peopleRoutes.js");
  const friendsPage = readSource("client/src/features/social/pages/FriendsPage.jsx");
  assert.match(page, /<Link to="\/friends"/);
  assert.match(page, /aria-label="Filter conversations"/);
  assert.doesNotMatch(page, /messageTabs|\[\["inbox", "Inbox"\], \["friends"/);
  assert.match(friendsPage, /read\(tab==="friends"/);
  assert.match(people, /router\.get\("\/friends\/contacts"/);
  assert.match(people, /router\.get\("\/friends\/presence"/);
  assert.match(people, /privacy\.onlineVisibility/);
});

test("homepage restores original composer, stories and feed but uses API data", () => {
  const home = readSource("client/src/features/social/feed/pages/HomePage.jsx");
  const feed = readSource("client/src/features/social/feed/hooks/useFeed.js");
  assert.match(home, /<StoryRail/);
  assert.match(home, /<PostComposer/);
  assert.match(home, /<PostCard/);
  assert.match(feed, /read\("\/feed\/posts"/);
  assert.match(feed, /create\("\/feed\/posts"/);
});

test("post card actions pass the expected argument shape", () => {
  const card = readSource("client/src/features/social/feed/components/PostCard.jsx");
  assert.match(card, /onToggleLike\(\)/);
  assert.match(card, /onToggleSave\(\)/);
  assert.match(card, /onRemove\(\)/);
  assert.doesNotMatch(card, /on(?:ToggleLike|ToggleSave|Remove)\(post\.id\)/);
});

test("stories and posts are persisted and private media checks are enforced", () => {
  const routes = readSource("server/src/social/feedRoutes.js");
  const storyRoutes = readSource("server/src/social/storyRoutes.js");
  const media = readSource("server/src/media/routes.js");
  assert.match(routes, /router\.post\("\/feed\/posts"/);
  assert.match(storyRoutes, /router\.get\('\/stories'/);
  assert.match(storyRoutes, /router\.post\('\/stories'/);
  assert.match(media, /await canSeePost/);
  assert.match(media, /await canSeeStory/);
});
