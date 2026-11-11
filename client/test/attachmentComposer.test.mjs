import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { attachmentKind, messageKindFor, validateAttachment } from '../src/features/social/messaging/attachmentRules.js';
import { mergeMessage } from '../src/features/social/messaging/messageCache.js';

const source = (name) => readFileSync(new URL(name, import.meta.url), 'utf8');

test('attachment validation allows up to four files and prevents the same selection twice', () => {
  const image = { name: 'picture.png', type: 'image/png', size: 256000, lastModified: 42 };
  assert.equal(attachmentKind(image), 'image');
  assert.equal(validateAttachment(image, []), '');
  assert.match(validateAttachment(image, [{ file: image }]), /already attached/);
  assert.match(validateAttachment(image, Array(4).fill({ file: { name: 'other.png' } })), /up to 4 files/);
  assert.equal(attachmentKind({ type: 'application/pdf' }), 'file');
  assert.equal(attachmentKind({ type: 'video/mp4' }), 'video');
});

test('mixed image, video and PDF attachments use a mixed message kind', () => {
  assert.equal(messageKindFor([{ kind: 'image' }, { kind: 'video' }, { kind: 'file' }]), 'mixed');
  assert.equal(messageKindFor([{ kind: 'image' }, { kind: 'image' }]), 'image');
  assert.equal(messageKindFor([]), 'text');
});

test('draft files are only uploaded on Send and composer stays intact after failure', () => {
  const src = source('../src/features/social/messaging/ChatComposer.jsx');
  assert.match(src, /onChange=\{\(event\) => addFiles\(event\.target\.files\)\}/);
  assert.match(src, /await uploadMedia\(/);
  assert.match(src, /await waitForMedia\(/);
  assert.match(src, /onSubmit\(\{ clientId: submissionId, text: draftText, attachments: uploaded/);
  assert.match(src, /role="alert"/);
  assert.match(src, /aria-label=\{`Remove \$\{item\.file\.name\}`\}/);
  assert.match(src, /onPaste=\{\(event\)/);
  assert.match(src, /onDrop=\{\(event\)/);
  assert.match(src, /type="submit" disabled=\{sending \|\| busy \|\| disabled \|\| !valid\}/);
  assert.match(src, /onKeyDown=\{\(event\)/);
  assert.match(src, /event\.shiftKey/);
  assert.match(src, /aria-label="Selected attachments"/);
});

test('optimistic image previews are replaced by durable media metadata from the server', () => {
  const old = { pages: [{ items: [{ _id: 'pending:send1', clientId: 'send1', localAttachments: [{ url: 'blob:local' }], sendingState: 'sending' }] }], pageParams: [null] };
  const updated = mergeMessage(old, { _id: 'saved1', clientId: 'send1', attachments: [{ id: 'image1', kind: 'image' }] });
  assert.equal(updated.pages[0].items.length, 1);
  assert.equal(updated.pages[0].items[0]._id, 'saved1');
  assert.equal(updated.pages[0].items[0].localAttachments, undefined);
  assert.equal(updated.pages[0].items[0].sendingState, undefined);
  assert.equal(updated.pages[0].items[0].attachments[0].kind, 'image');
});

test('message bubble renders each persisted attachment by its kind and filename', () => {
  const src = source('../src/features/social/messaging/ChatMessage.jsx');
  assert.match(src, /message\.attachments\?\.length/);
  assert.match(src, /asset\.kind === "video"/);
  assert.match(src, /asset\.kind === "file"/);
  assert.match(src, /asset\.name/);
  assert.match(src, /message\.localAttachments/);
});
