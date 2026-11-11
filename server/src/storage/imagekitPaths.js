/** Pure storage naming/validation. No credentials or SDK dependency. */
function safeSegment(value) { return String(value ?? '').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128); }
export function buildObjectPrefix({ kind, purpose, ownerId, entityId, prefix = '/aevora' }) {
  const owner = safeSegment(ownerId);
  const entity = safeSegment(entityId);
  const namespace = String(prefix || '/aevora').replace(/^\/+|\/+$/g, '').replace(/[^a-zA-Z0-9_/-]/g, '_');
  const paths = {
    avatar: `users/${owner}/avatars/${entity}`,
    cover: `users/${owner}/covers/${entity}`,
    post: `posts/${owner}/${entity}`,
    story: `posts/${owner}/stories/${entity}`,
    story_audio: `audio/${owner}/tracks/${entity}`,
    community: `communities/${owner}/channels/${entity}`,
    video: `videos/${owner}/${entity}`,
    message: `messages/${owner}/attachments/${entity}`,
  };
  return `${namespace}/${paths[purpose] || (kind === 'file' ? `documents/${owner}/${entity}` : `media/${owner}/${entity}`)}`;
}
export function normalizeObjectKey(key) {
  const normalized = String(key || '').replace(/^\/+/, '');
  if (!normalized || normalized.split('/').some(x => !x || x === '.' || x === '..') || /[?#\\]/.test(normalized)) {
    throw new Error('Invalid ImageKit object key.');
  }
  return normalized;
}
