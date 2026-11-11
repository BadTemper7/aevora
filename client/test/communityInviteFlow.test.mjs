import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const front = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8');
const back = (path) => readFileSync(new URL(`../../server/src/${path}`, import.meta.url), 'utf8');
const page = front('features/communities/pages/CommunityInvitePage.jsx');
const communityVisuals = front('features/communities/components/CommunityVisuals.jsx');
const communityApi = front('features/communities/api/communityApi.js');
const backend = back('communities/communityRoutes.js');
const media = back('media/routes.js');

test('Existing members navigate directly and never see the accept form', () => {
  assert.match(page, /const alreadyMember = invitation\.data\?\.isMember === true/);
  assert.match(page, /if \(alreadyMember && community\?\.id\)/);
  assert.match(page, /navigate\(`\/communities\/\$\{community\.id\}`, \{ replace: true \}\)/);
  assert.match(page, /invitation\.isLoading \|\| alreadyMember/);
  assert.match(backend, /const joined = await communityAlreadyJoined\(invite, req\.user\.id\)/);
  assert.match(backend, /if \(joined\) return \{ community: sanitize\(joined\), isMember: true \};/);
  assert.match(backend, /if \(joined\) return \{ status: 'active', community: sanitize\(joined\) \};/);
});

test('Invite page reuses community banner and floating icon with token-protected images', () => {
  assert.match(page, /<Banner\s+community=\{community\}\s+inviteToken=\{token\}/);
  assert.match(page, /<CommunityAvatar\s+community=\{community\}\s+inviteToken=\{token\}/);
  assert.match(page, /absolute -bottom-9 left-5 z-10/);
  assert.match(page, /imageFit="contain"/);
  assert.match(page, /bg-surface p-1 shadow-lg ring-1 ring-line/);
  assert.match(communityVisuals, /communityFile\(community\.iconId, true, inviteToken\)/);
  assert.match(communityVisuals, /communityFile\(community\.bannerId, false, inviteToken\)/);
  assert.match(communityApi, /params\.set\("invite", inviteToken\)/);
});

test('Branding can be fetched by an invited non-member but other attachments cannot', () => {
  assert.match(media, /\{ iconId: String\(media\._id\) \}, \{ bannerId: String\(media\._id\) \}/);
  assert.match(media, /String\(invite\.communityId\) === String\(space\._id\)/);
  assert.match(media, /invitationAllowsViewer\(invite, req\.user\.id\)/);
  assert.match(media, /CommunityBan\.exists/);
  assert.match(backend, /isMember: false/);
});

test('Inbox invitations for existing members show Open community, not Accept', () => {
  const discovery = front('features/communities/pages/CommunityDiscoveryPage.jsx');
  assert.match(discovery, /invitation\.alreadyMember \? \(/);
  assert.match(discovery, /Open community/);
  assert.match(backend, /alreadyMember: memberIds\.has\(String\(i\.communityId\)\)/);
});
