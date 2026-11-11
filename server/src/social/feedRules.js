import { audienceAllows, blocked, isFollower, isFriend, privacyFor } from "./helpers.js";
import { storyAccessAllowed, storyAudienceAllows } from "./storyAudiencePolicy.js";

// Feed and media-file endpoints intentionally share these authorization checks.
export async function canSeePost(viewer, post) {
  if (viewer === post.ownerId) return true;
  if (await blocked(viewer, post.ownerId)) return false;
  const privacy = await privacyFor(post.ownerId);
  if (privacy.privateProfile && !await isFriend(viewer, post.ownerId) && !await isFollower(viewer, post.ownerId)) return false;
  if (!await audienceAllows(viewer, post.ownerId, privacy.profileVisibility || "public")) return false;
  return audienceAllows(viewer, post.ownerId, post.visibility);
}

export async function canSeeStory(viewer, story) {
  if (!viewer || !story?.ownerId) return false;
  // Check validity before contacting the DB. Owner access still requires an
  // unexpired story, but does not require a Friendship record.
  if (viewer === story.ownerId) return storyAccessAllowed(viewer, story);
  if (!storyAccessAllowed(viewer, story, { acceptedFriend: true })) return false;
  if (await blocked(viewer, story.ownerId)) return false;
  // Follow/subscription status is never enough. Accepted friends only.
  if (!await isFriend(viewer, story.ownerId)) return false;
  if (!storyAudienceAllows(viewer, story)) return false;
  const privacy = await privacyFor(story.ownerId);
  return storyAccessAllowed(viewer, story, {
    acceptedFriend: true,
    profileAllowed: await audienceAllows(viewer, story.ownerId, privacy.profileVisibility || "public"),
  });
}
