import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { REACTION_OPTIONS, nextReaction, isSupportedReactionEmoji as isClientEmoji } from "../src/features/social/components/reactionOptions.js";
import { MESSAGE_REACTIONS, isSupportedReactionEmoji as isServerEmoji } from "../../server/src/social/reactionOptions.js";

const messagePage = readFileSync(new URL("../src/features/social/pages/MessagesPage.jsx", import.meta.url), "utf8");
const messageBubble = readFileSync(new URL("../src/features/social/messaging/ChatMessage.jsx", import.meta.url), "utf8");
const actions = readFileSync(new URL("../src/features/social/components/MessageActions.jsx", import.meta.url), "utf8");
const picker = readFileSync(new URL("../src/components/common/EmojiPicker.jsx", import.meta.url), "utf8");
const backend = readFileSync(new URL("../../server/src/social/messageRoutes.js", import.meta.url), "utf8");
const models = readFileSync(new URL("../../server/src/social/models.js", import.meta.url), "utf8");
const packageJSON = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const extended = [
  "\u{1f680}", // rocket, not part of the quick bar
  "\u{1f979}", // face holding back tears
  "\u{1f1f5}\u{1f1ed}", // Philippine flag
  "\u{1f469}\u{1f3fd}\u200d\u{1f4bb}", // woman technologist, medium skin tone
  "1\ufe0f\u20e3", // keycap
  "\u{1f3f3}\ufe0f\u200d\u{1f308}", // rainbow flag
  "\u{1f468}\u200d\u{1f469}\u200d\u{1f466}", // family
];

test("the curated list is only the quick toolbar, not the full picker", () => {
  assert.deepEqual(REACTION_OPTIONS.map(({emoji}) => emoji), MESSAGE_REACTIONS);
  assert.equal(REACTION_OPTIONS.length, 6);
  assert.match(actions, /const QUICK_REACTIONS = REACTION_OPTIONS\.slice\(0, 4\)/);
  assert.doesNotMatch(actions, /EXTRA_REACTIONS/);
  assert.match(actions, /aria-label="Add reaction"/);
  assert.match(actions, /<EmojiPicker[\s\S]*label="Choose a message reaction"/);
});

test("all single-emoji reactions work, including flags, keycaps and skin tones", () => {
  for (const emoji of [...MESSAGE_REACTIONS, ...extended]) {
    assert.equal(isClientEmoji(emoji), true, `frontend rejected ${emoji}`);
    assert.equal(isServerEmoji(emoji), true, `backend rejected ${emoji}`);
    assert.equal(nextReaction(null, emoji), emoji);
    assert.equal(nextReaction(emoji, emoji), null);
  }
  assert.equal(nextReaction("\u{1f44d}", "\u{1f680}"), "\u{1f680}");
});

test("backend and frontend reject plain text, multiple emojis and invalid values", () => {
  for (const bad of [null, undefined, "", "hello", "0", "\u{1f680} launch", "\u{1f44d}\u{1f680}", " ", "\u{1f44d}\n", "x".repeat(65)]) {
    assert.equal(isClientEmoji(bad), false, `frontend accepted ${String(bad)}`);
    assert.equal(isServerEmoji(bad), false, `backend accepted ${String(bad)}`);
    assert.equal(nextReaction("\u{1f44d}", bad), undefined);
  }
});

test("picker is a complete on-demand emoji library with search and theme support", () => {
  assert.equal(packageJSON.dependencies["emoji-picker-react"], "^5.1.0");
  assert.match(picker, /lazy\(\(\) => import\("emoji-picker-react"\)\)/);
  assert.match(picker, /onEmojiClick=\{\(data\) => onSelect\?\.\(data\.emoji\)\}/);
  assert.match(picker, /colorScheme=\{scheme\}/);
  assert.match(picker, /data-emoji-picker-root/);
  assert.doesNotMatch(picker, /DEFAULT_EMOJIS/);
});

test("hover and mobile toolbar stays accessible, and portaled picker clicks do not close it", () => {
  assert.match(actions, /group-hover\/message:opacity-100/);
  assert.match(actions, /group-focus-within\/message:opacity-100/);
  assert.match(actions, /aria-label="Show message reactions and actions"/);
  assert.match(actions, /\[@media\(hover:none\)\]:grid/);
  assert.match(actions, /\[data-emoji-picker-root\]/);
});

test("reaction summary displays and can toggle all chosen emojis", () => {
  assert.match(messagePage, /<ChatMessage message=\{items\[row\.index\]\}/);
  assert.match(messageBubble, /<MessageActions[\s\S]*message=\{message\}/);
  assert.match(messageBubble, /<MessageReactionSummary reactions=\{message\.reactions \|\| \[\]\}/);
  assert.doesNotMatch(actions, /Previous reaction \(read only\)/);
  assert.match(actions, /counts\.set\(reaction\.emoji/);
});

test("server stores one reaction per user, notifies and updates over Socket.IO", () => {
  assert.match(backend, /z\.string\(\)\.max\(64\)\.refine\(isSupportedReactionEmoji/);
  assert.doesNotMatch(backend, /z\.enum\(MESSAGE_REACTIONS\)/);
  assert.match(models, /emoji: \{ \.\.\.str, maxlength: 64 \}/);
  assert.match(backend, /msg\.reactions = msg\.reactions\.filter\(\(r\) => r\.userId !== req\.user\.id\)/);
  assert.match(backend, /router\.delete\("\/messages\/:id\/reactions"/);
  assert.match(backend, /emitMessage\(c, "message:updated", msg\)/);
});
