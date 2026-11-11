export function notificationDestination(item) {
  if (typeof item?.url === 'string' && /^\/(?!\/)[a-z0-9/#?=&_-]*$/i.test(item.url)) return item.url;
  const type = item?.type || '';
  if (type === 'friend_request') return '/friends?tab=received';
  if (type === 'friend_accepted') return '/friends?tab=friends';
  if (type === 'community_invite') return '/communities#invitations';
  if (type === 'community_join_request' || type === 'community_join_response' || type === 'community_access_changed')
    return item.entityId ? `/communities/${encodeURIComponent(item.entityId)}` : '/communities';
  if (type.startsWith('community_')) return '/communities';
  if (type.startsWith('follow') || type === 'new_follow' || type === 'new_subscriber') return '/friends';
  if (type.startsWith('video')) return item.entityId ? `/videos/${encodeURIComponent(item.entityId)}` : '/videos';
  if (type.startsWith('post')) return item.entityId ? `/posts/${encodeURIComponent(item.entityId)}` : '/';
  if (type === 'account_alert' || type === 'account_security' || type === 'moderation_action') return '/privacy-safety';
  return '/';
}

export function uniqueNotifications(pages = []) {
  const seen = new Set();
  const result = [];
  for (const page of pages) for (const item of page?.items || []) {
    const id = String(item._id);
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(item);
  }
  return result;
}

export function relativeNotificationTime(value) {
  const delta = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(delta)) return '';
  const seconds = Math.max(0, Math.round(delta / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d ago` : new Date(value).toLocaleDateString();
}
