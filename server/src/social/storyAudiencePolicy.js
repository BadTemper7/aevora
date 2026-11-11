// Older stories may still have public/followers values in MongoDB.
// Those legacy values are deliberately interpreted as friends-only.
export function storyAudienceAllows(viewerId, story) {
  if (story.visibility === 'selected') return Array.isArray(story.allowedViewerIds) && story.allowedViewerIds.includes(viewerId);
  // Legacy public/followers records also require friendship in canSeeStory.
  return ['friends', 'public', 'followers', undefined, null].includes(story.visibility);
}


/**
 * Final story-access decision. `acceptedFriend` must come from the server's
 * accepted Friendship record, NEVER a follow request or client-side hint.
 * Legacy "public" and "followers" records are still friends-only.
 */
export function storyAccessAllowed(viewerId, story, {
  acceptedFriend = false,
  isBlocked = false,
  profileAllowed = true,
  now = Date.now(),
} = {}) {
  if (!viewerId || !story?.ownerId) return false;
  const expires = new Date(story.expiresAt).getTime();
  if (!Number.isFinite(expires) || expires <= now) return false;
  if (viewerId === story.ownerId) return true;
  return acceptedFriend && !isBlocked && profileAllowed && storyAudienceAllows(viewerId, story);
}
