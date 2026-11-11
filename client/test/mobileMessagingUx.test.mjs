import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { messagesInChronologicalOrder, mergeMessage } from "../src/features/social/messaging/messageCache.js";

const source = (relative) => readFileSync(new URL(`../src/${relative}`, import.meta.url), "utf8");

test("Communities and other app pages are accessible from the messenger header", () => {
  const layout = source("layouts/MessageLayout.jsx");
  const menu = source("layouts/main/MessageNavigationMenu.jsx");
  assert.match(layout, /<MessageNavigationMenu\s*\/>/);
  assert.match(menu, /label: "Communities", path: ROUTES\.communities/);
  assert.match(menu, /MORE_NAV\.filter/);
  assert.match(menu, /aria-expanded=\{open\}/);
  assert.match(layout, /<ThemeToggle\s*\/>/);
});

test("Messenger has no bottom tab navigation, while Communities retains its tabs", () => {
  assert.doesNotMatch(source("layouts/MessageLayout.jsx"), /<MobileNav/);
  assert.match(source("layouts/CommunityLayout.jsx"), /<MobileNav docked\s*\/>/);
});

test("Chat starts at its most recent message and offers a Latest shortcut", () => {
  const page = source("features/social/pages/MessagesPage.jsx");
  assert.match(page, /initialScrollDone/);
  assert.match(page, /useLayoutEffect/);
  assert.match(page, /virtual\.scrollToIndex\(items\.length - 1/);
  assert.match(page, /Jump to newest message/);
  assert.match(page, /ResizeObserver/);
});

test("Mobile reactions open from a tapped or held bubble, not the entire message row", () => {
  const message = source("features/social/messaging/ChatMessage.jsx");
  const actions = source("features/social/components/MessageActions.jsx");
  const article = message.slice(message.indexOf("return <article"), message.indexOf("data-message-bubble"));
  const bubble = message.slice(message.indexOf("data-message-bubble"), message.indexOf("{message.replyTo &&"));
  assert.doesNotMatch(article, /onTouchStart=|onClick=\{revealTouchActions\}/);
  assert.match(bubble, /onTouchStart=\{startPress\}/);
  assert.match(bubble, /onClick=\{revealTouchActions\}/);
  assert.match(message, /longPressFired/);
  assert.match(message, /window\.matchMedia\?\.\("\(hover: none\)"\)/);
  assert.match(actions, /group-hover\/bubble/);
  assert.match(actions, /\[@media\(hover:none\)\]:hidden/);
});

test("Emoji, GIF, and reaction popovers are positioned inside the visual viewport", () => {
  for (const file of [
    "components/common/EmojiPicker.jsx",
    "features/social/messaging/GifPicker.jsx",
    "features/social/components/MessageActions.jsx",
  ]) {
    const component = source(file);
    assert.match(component, /visualViewport/);
    assert.match(component, /createPortal/);
  }
});

test("Composer places a single attachment menu, input, and sticker/send in one row", () => {
  const composer = source("features/social/messaging/ChatComposer.jsx");
  assert.match(composer, /data-message-composer-row/);
  assert.match(composer, /data-composer-tools/);
  assert.match(composer, /Open attachment tools/);
  assert.match(composer, /aria-label="Attach file"/);
  assert.match(composer, /aria-label="Open GIF picker"/);
  assert.match(composer, /aria-label="Insert emoji"/);
  assert.match(composer, /\{showQuickEmoji \? <button data-composer-sticker/);
  assert.match(composer, /: <button data-composer-send/);
  assert.match(composer, /!border-line-strong/);
  assert.match(composer, /size-11/);
});

test("Message ordering is chronological regardless of backend page order", () => {
  const older = { _id: "one", createdAt: "2026-11-10T01:00:00Z" };
  const newer = { _id: "two", createdAt: "2026-11-10T02:00:00Z" };
  const data = { pages: [{ items: [newer] }, { items: [older] }] };
  assert.deepEqual(messagesInChronologicalOrder(data).map((item) => item._id), ["one", "two"]);
  assert.deepEqual(messagesInChronologicalOrder(mergeMessage(data, newer)).map((item) => item._id), ["one", "two"]);
});
