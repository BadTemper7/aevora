import assert from 'node:assert/strict';
import test from 'node:test';
import { invitationAllowsViewer } from './invitationPolicy.js';

const now = new Date('2026-11-11T00:00:00Z');

test('A live, unrestricted invitation may show branding to any signed-in viewer holding its token', () => {
  assert.equal(invitationAllowsViewer({ maxUses: 0, uses: 10 }, 'user-1', now), true);
});

test('A direct invitation is available only to the intended user', () => {
  const invite = { invitedId: 'user-1', maxUses: 0, uses: 0 };
  assert.equal(invitationAllowsViewer(invite, 'user-1', now), true);
  assert.equal(invitationAllowsViewer(invite, 'user-2', now), false);
});

test('Revoked, expired, used-up, and missing invitations never grant branding access', () => {
  assert.equal(invitationAllowsViewer(null, 'user-1', now), false);
  assert.equal(invitationAllowsViewer({ revokedAt: new Date('2026-11-10') }, 'user-1', now), false);
  assert.equal(invitationAllowsViewer({ expiresAt: new Date('2026-11-11T00:00:00Z') }, 'user-1', now), false);
  assert.equal(invitationAllowsViewer({ expiresAt: new Date('2026-11-12') }, 'user-1', now), true);
  assert.equal(invitationAllowsViewer({ maxUses: 2, uses: 2 }, 'user-1', now), false);
  assert.equal(invitationAllowsViewer({ maxUses: 2, uses: 1 }, 'user-1', now), true);
});
