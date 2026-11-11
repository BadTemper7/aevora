// Shared policy for invite previews and the two community branding images.
// Possession of a valid invitation does not authorize channel or message media.
export function invitationAllowsViewer(invite, userId, now = new Date()) {
  if (!invite || invite.revokedAt) return false;
  if (invite.expiresAt && new Date(invite.expiresAt) <= now) return false;
  if (invite.maxUses > 0 && invite.uses >= invite.maxUses) return false;
  if (invite.invitedId && invite.invitedId !== userId) return false;
  return true;
}
