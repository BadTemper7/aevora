import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = (relative) => readFileSync(new URL(relative, import.meta.url), 'utf8');
const rail = source('../src/features/social/feed/components/StoryRail.jsx');
const viewer = source('../src/features/social/feed/stories/StoryViewer.jsx');
const routes = source('../../server/src/social/storyRoutes.js');
const media = source('../../server/src/media/routes.js');

test('Story cache is account-scoped and refetched when a user returns or opens a story', () => {
  assert.match(rail, /queryKey:\s*\['stories',viewerId\]/);
  assert.match(rail, /enabled:\s*!!viewerId/);
  assert.match(rail, /gcTime:\s*0/);
  assert.match(rail, /refetchOnWindowFocus:\s*'always'/);
  assert.match(rail, /const latest=await read\('\/stories'\)/);
  assert.match(rail, /latest\.some\(story=>story\.id===storyId\)/);
});

test('The story viewer blocks rendering media until the current account gets authorization', () => {
  assert.match(viewer, /authorizedKey===currentAuthKey/);
  assert.match(viewer, /create\(`\/stories\/\$\{story\.id\}\/view`\)/);
  assert.match(viewer, /if\(!authorized\)return createPortal/);
  assert.match(viewer, /Checking story access/);
});

test('Private story responses and files cannot be cached or converted into shareable signed URLs', () => {
  assert.match(routes, /router\.use\('\/stories',/);
  assert.match(routes, /'private, no-store, max-age=0'/);
  assert.match(media, /media\.purpose === 'story' \? 'private, no-store, max-age=0'/);
  assert.match(media, /media\.purpose === 'story'\) throw new AppError\('Private stories do not support shareable media URLs\.', 403\)/);
});

test('Story authorization applies before allowing an image reused as public music cover', () => {
  const storyBranch = media.slice(media.indexOf('if (media.purpose === "story")'));
  const authorizeMediaStart = storyBranch.indexOf('const stories = await SocialStory.find');
  const publicCover = storyBranch.indexOf("return cover?.visibility === 'public'");
  assert.ok(authorizeMediaStart > 0 && publicCover > authorizeMediaStart);
});
