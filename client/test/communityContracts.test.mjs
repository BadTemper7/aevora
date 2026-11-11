import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';
// Source-contract checks run without npm dependencies. These complement, but
// are not a substitute for, real browser and LiveKit integration tests.
const root=resolve(import.meta.dirname,'../..');
const source=(path)=>readFileSync(resolve(root,path),'utf8');
const routes=source('server/src/app.js');
const backend=source('server/src/communities/communityRoutes.js');
const channels=source('server/src/communities/channelRoutes.js');
const media=source('server/src/communities/mediaService.js');
const socket=source('server/src/communities/events.js');
const client=source('client/src/features/communities/pages/CommunityPage.jsx');
const voice=source('client/src/features/communities/components/VoiceDock.jsx');
const chat=source('client/src/features/communities/components/ChannelChat.jsx');
const prefs=source('client/src/features/social/pages/PrivacyPage.jsx');

test('community router remains inside AEVORA authenticated Express app',()=>{
  assert.match(routes,/authenticate, socialRateLimiter, communityRoutes, channelRoutes, communityMediaRoutes, communityEventRoutes/);
  assert.match(routes,/app\.all\("\/api\/auth\/\*"/);
});
test('community creation seeds three channel categories and text/voice channels',()=>{
  for(const category of ['INFORMATION','GENERAL','VOICE CHANNELS'])assert(backend.includes(category));
  for(const name of ['welcome','announcements','rules','general','media','off-topic','General Voice','Gaming Room','Lounge'])assert(backend.includes(name));
});
test('accepting an invite requires a valid hashed token and explicit rules consent',()=>{
  assert(backend.includes("tokenHash: hash(token)"));
  assert(backend.includes('rulesAccepted'));
  assert(backend.includes("'Invitation is expired or unavailable.'"));
});
test('channel creation and messages enforce membership-based permissions',()=>{
  assert(channels.includes("need(ctx,'manage_channels')"));
  assert(channels.includes("channelContext(req.params.channelId,req.user.id,'send_messages')"));
  assert(channels.includes('replyTo'));
});
test('message retries are idempotent across optimistic and persisted states',()=>{
  assert(channels.includes('includeResultMetadata:true'));
  assert(channels.includes('updatedExisting'));
  assert(chat.includes('crypto.randomUUID()'));
  assert(chat.includes('mergeCommunityMessage'));
});
test('Socket.IO room joins authorize membership and channel visibility',()=>{
  assert(socket.includes('await communityContext('));
  assert(socket.includes('await channelContext('));
  assert(socket.includes('socket.join(`channel:'));
  assert(socket.includes('room startsWith')===false);
});
test('LiveKit issues short-lived backend-generated tokens and verifies webhooks',()=>{
  assert(media.includes('new AccessToken(process.env.LIVEKIT_API_KEY,process.env.LIVEKIT_API_SECRET'));
  assert(media.includes("ttl:'2m'"));
  assert(media.includes('new WebhookReceiver'));
  assert(routes.includes('express.text({ type: "application/webhook+json"'));
});
test('voice uses real capture with explicit screen-sharing control',()=>{
  assert(voice.includes('LiveKitRoom'));
  assert(voice.includes('setScreenShareEnabled'));
  assert(voice.includes('navigator.mediaDevices?.getDisplayMedia'));
  assert(voice.includes('setCameraEnabled'));
});
test('voice persists within community layout while channels switch',()=>{
  assert(source('client/src/layouts/CommunityLayout.jsx').includes('<VoiceProvider>'));
  assert.match(source('client/src/layouts/CommunityLayout.jsx'), /<VoiceDock\s*\/>/);
});
test('privacy & safety includes community invite controls',()=>{
  assert(prefs.includes('communityInviteAudience'));
  assert(source('server/src/communities/permissions.js').includes('canInviteUser'));
});
test('forum, polls, events and stage controls remain active',()=>{
  for(const segment of ['/threads','/polls','/messages/:messageId/pin'])assert(channels.includes(segment));
  assert(source('server/src/communities/mediaRoutes.js').includes("'/channels/:channelId/stage/hand'"));
  assert(source('client/src/features/communities/components/CommunityPanels.jsx').includes('EventsPanel'));
});
test('unread counts and announcements honor notification and channel permissions',()=>{
  assert(channels.includes("'/communities/:id/unread'"));
  assert(channels.includes("'/channels/:channelId/read'"));
  assert(channels.includes('CommunityNotificationSettings'));
  assert(channels.includes('community_announcement'));
});
test('default homepage and private group DMs remain distinct from communities',()=>{
  const router=source('client/src/app/router.jsx');
  assert(router.includes('HomePage'));
  assert(router.includes('MessageLayout'));
  assert(router.includes('CommunityLayout'));
});
