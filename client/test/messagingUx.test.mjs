import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const src = (file) => readFileSync(new URL(file, import.meta.url), "utf8");

test("composer limits to five rows and only shows overflow scroll when necessary", () => {
  const source = src("../src/features/social/messaging/ChatComposer.jsx");
  assert.match(source, /const maxHeight = 140/);
  assert.match(source, /box\.style\.overflowY = measured > maxHeight \? "auto" : "hidden"/);
  assert.match(source, /style=\{\{ resize: "none"/);
  assert.match(source, /onQuickEmoji/);
  assert.match(source, /showQuickEmoji/);
});

test("GIPHY uses browser calls with no API or media caching", () => {
  const source = src("../src/features/social/messaging/giphyClient.js");
  const picker = src("../src/features/social/messaging/GifPicker.jsx");
  assert.match(source, /https:\/\/api\.giphy\.com\/v1\/gifs/);
  assert.match(source, /cache: "no-store"/);
  assert.match(picker, /browseGiphy/);
  assert.match(picker, /Powered by/);
  assert.match(picker, /GIPHY/);
  assert.match(picker, /My GIFs/);
  assert.match(picker, /getGiphyByIds/);
});

test("chat emoji updates existing conversation and has a default quick send action", () => {
  const info = src("../src/features/social/messaging/ChatInfoPanel.jsx");
  const page = src("../src/features/social/pages/MessagesPage.jsx");
  assert.match(info, /save\(\{ quickEmoji: emoji \}\)/);
  assert.match(info, /Restore default 👍 emoji/);
  assert.match(info, /client\.setQueryData\(\["conversations", conversation\.id\]/);
  assert.match(page, /quickEmoji=\{c\.quickEmoji \|\| "👍"\}/);
  assert.match(page, /onQuickEmoji/);
});

test("chats use conversation filtering, not hardcoded tabs or fake Marketplace data", () => {
  const page = src("../src/features/social/pages/MessagesPage.jsx");
  assert.match(page, /\["marketplace", "Marketplace"\]/);
  assert.match(page, /\["groups", "Groups"\]/);
  assert.match(page, /aria-label="Filter conversations"/);
  assert.match(page, /role="menuitemradio"/);
  assert.match(page, /new URLSearchParams\(location\.search\)/);
  assert.doesNotMatch(page, /const messageTabs/);
});

test("messages use concurrent idempotent sends; sockets do not stall on presence sync", () => {
  const page = src("../src/features/social/pages/MessagesPage.jsx");
  const sockets = src("../../server/src/realtime/socketServer.js");
  const server = src("../../server/src/social/messageRoutes.js");
  assert.doesNotMatch(page, /sendQueue\.current/);
  assert.match(page, /clientId: uuidv4\(\)/);
  assert.match(sockets, /void \(async \(\) =>/);
  assert.match(sockets, /socket\.on\("message:delivered"/);
  assert.match(server, /void emitNewMessage\(c, storedMessage\)/);
  assert.match(server, /Block\.find\(\{ \$or:/);
});
