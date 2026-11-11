import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeAudioSettings, DEFAULT_AUDIO_SETTINGS, loadAudioSettings, storeAudioSettings } from '../src/features/communities/components/audioSettings.js';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const header = read('../src/layouts/CommunicationHeader.jsx');
const messages = read('../src/layouts/MessageLayout.jsx');
const communities = read('../src/layouts/CommunityLayout.jsx');
const composer = read('../src/features/social/messaging/ChatComposer.jsx');
const community = read('../src/features/communities/pages/CommunityPage.jsx');
const voiceDock = read('../src/features/communities/components/VoiceDock.jsx');
const channelChat = read('../src/features/communities/components/ChannelChat.jsx');

test('Messages and Communities share the same minimal header', () => {
  assert.match(messages, /<CommunicationHeader title="Messages"/);
  assert.match(communities, /<CommunicationHeader title="Communities"/);
  assert.match(header, /<Logo size="sm"/);
  assert.match(header, /<ThemeToggle/);
  assert.doesNotMatch(header + messages + communities, /NotificationBell|<ArrowLeft|<House|<Compass/);
});

test('Mobile composer gives text a full row and retains desktop inline layout', () => {
  assert.match(composer, /order-1 min-h-11 w-full/);
  assert.match(composer, /sm:order-4 sm:w-auto sm:flex-1/);
  assert.match(composer, /flex min-w-0 flex-wrap items-center/);
  assert.match(composer, /sm:flex-nowrap/);
  assert.match(composer, /maxHeight: 140/);
  assert.match(composer, /sm:ml-0/);
  assert.match(composer, /env\(safe-area-inset-bottom\)/);
});

test('Community sections are always visible on phone without clipped navigation', () => {
  assert.match(community, /grid-cols-4 gap-1/);
  assert.match(community, /sm:flex sm:w-auto/);
  assert.match(community, /\["channel", "Spaces"/);
  assert.match(community, /\["events", "Events"/);
  assert.match(community, /\["invites", "Invites"/);
  assert.match(community, /\["settings", "Settings"/);
});

test('Collapsed voice dock stays in page flow on phones so composer is reachable', () => {
  assert.match(voiceDock, /'relative w-full shrink-0/);
  assert.match(voiceDock, /sm:fixed sm:bottom-3/);
  assert.match(voiceDock, /fixed inset-x-2/);
});

test('Browser audio processing defaults are safe and invalid stored values are rejected', () => {
  assert.deepEqual(normalizeAudioSettings(null), DEFAULT_AUDIO_SETTINGS);
  assert.deepEqual(normalizeAudioSettings({noiseSuppression:false,echoCancellation:'no',autoGainControl:false}), {noiseSuppression:false,echoCancellation:true,autoGainControl:false});
});

test('Noise suppression settings persist locally without requiring API keys', () => {
  const data=new Map();
  globalThis.window={localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)}};
  storeAudioSettings({noiseSuppression:false,echoCancellation:true,autoGainControl:false});
  assert.deepEqual(loadAudioSettings(),{noiseSuppression:false,echoCancellation:true,autoGainControl:false});
  delete globalThis.window;
});

test('LiveKit microphone uses actual WebRTC audio constraints', () => {
  assert.match(voiceDock, /setMicrophoneEnabled\(!isMicrophoneEnabled, audioSettings\)/);
  assert.match(voiceDock, /track\.applyConstraints\(next\)/);
  assert.match(voiceDock, /setAudioOption\(key,event\.target\.checked\)/);
});

test('Community composer forwards queued attachments and stable client id', () => {
  assert.match(channelChat, /onSubmit=\{\(submission\) => send\(\{/);
  assert.match(channelChat, /submission\.attachments\?\.map\(\(item\) => item\.id\)/);
  assert.match(channelChat, /override\?\.clientId/);
  assert.match(channelChat, /throw err;/);
});
