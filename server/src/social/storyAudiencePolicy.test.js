import test from 'node:test';
import assert from 'node:assert/strict';
import { storyAudienceAllows } from './storyAudiencePolicy.js';

test('Friends-only stories do not require a secondary list', () => {
  assert.equal(storyAudienceAllows('personA', { visibility: 'friends' }), true);
});
test('Selected-friends stories only permit explicitly chosen IDs', () => {
  const story = { visibility: 'selected', allowedViewerIds: ['friendA', 'friendB'] };
  assert.equal(storyAudienceAllows('friendA', story), true);
  assert.equal(storyAudienceAllows('friendB', story), true);
  assert.equal(storyAudienceAllows('friendC', story), false);
  assert.equal(storyAudienceAllows('friendA', { visibility: 'selected' }), false);
  assert.equal(storyAudienceAllows('friendA', { visibility: 'selected', allowedViewerIds: [] }), false);
});
test('Historical audiences are never public and require friendship at the route guard', () => {
  // This helper checks only the selected-friends list. canSeeStory checks
  // accepted friendship first for every story, including old records.
  assert.equal(storyAudienceAllows('viewer', { visibility: 'public' }), true);
  assert.equal(storyAudienceAllows('viewer', { visibility: 'followers' }), true);
  assert.equal(storyAudienceAllows('viewer', { visibility: 'unexpected' }), false);
});

import { storyAccessAllowed } from './storyAudiencePolicy.js';
const expiresAt = new Date(Date.now() + 60_000);
const story = (visibility, allowedViewerIds = []) => ({
  ownerId: 'story-owner', expiresAt, visibility, allowedViewerIds,
});

test('A public legacy story cannot be viewed by a stranger or a follower without an accepted friendship', () => {
  assert.equal(storyAccessAllowed('non-friend', story('public')), false);
  assert.equal(storyAccessAllowed('follower-only', story('followers'), { acceptedFriend: false }), false);
  assert.equal(storyAccessAllowed('accepted-friend', story('public'), { acceptedFriend: true }), true);
});
test('Only explicitly selected accepted friends can view a selected story', () => {
  const selected = story('selected', ['friend-1', 'former-friend']);
  assert.equal(storyAccessAllowed('friend-1', selected, { acceptedFriend: true }), true);
  assert.equal(storyAccessAllowed('friend-2', selected, { acceptedFriend: true }), false);
  assert.equal(storyAccessAllowed('former-friend', selected, { acceptedFriend: false }), false);
  assert.equal(storyAccessAllowed('friend-1', story('selected'), { acceptedFriend: true }), false);
});
test('Removing a friendship, blocking a user, or restricting profile access denies previously visible stories', () => {
  const friends = story('friends');
  assert.equal(storyAccessAllowed('friend-1', friends, { acceptedFriend: true }), true);
  assert.equal(storyAccessAllowed('friend-1', friends, { acceptedFriend: false }), false);
  assert.equal(storyAccessAllowed('friend-1', friends, { acceptedFriend: true, isBlocked: true }), false);
  assert.equal(storyAccessAllowed('friend-1', friends, { acceptedFriend: true, profileAllowed: false }), false);
});
test('Story authors can view only their active stories', () => {
  assert.equal(storyAccessAllowed('story-owner', story('friends')), true);
  assert.equal(storyAccessAllowed('story-owner', { ...story('friends'), expiresAt: new Date(Date.now() - 1000) }), false);
  assert.equal(storyAccessAllowed('friend-1', { ...story('friends'), expiresAt: 'invalid' }, { acceptedFriend: true }), false);
});
