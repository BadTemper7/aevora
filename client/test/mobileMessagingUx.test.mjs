import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { messagesInChronologicalOrder, mergeMessage } from "../src/features/social/messaging/messageCache.js";

const source = (relative) => readFileSync(new URL(`../src/${relative}`, import.meta.url), "utf8");

test("Mobile tab navigation includes Communities and an accessible More menu", () => {
  const nav = source("layouts/main/MobileNav.jsx");
  assert.match(nav, /label: "Communities", path: ROUTES\.communities/);
  assert.match(nav, /label: "More", action: "more"/);
  assert.match(nav, /MORE_NAV\.map/);
  assert.match(nav, /aria-expanded=\{moreOpen\}/);
});

test("Mobile navigation remains available inside full-screen chats and communities", () => {
  assert.match(source("layouts/MessageLayout.jsx"), /<MobileNav docked\s*\/>/);
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

test("Emoji, GIF and tap-to-react popovers are attached to the visual viewport", () => {
  const emoji = source("components/common/EmojiPicker.jsx");
  const gif = source("features/social/messaging/GifPicker.jsx");
  const reactions = source("features/social/components/MessageActions.jsx");
  for (const component of [emoji, gif, reactions]) {
    assert.match(component, /visualViewport/);
    assert.match(component, /createPortal/);
  }
  assert.match(source("features/social/messaging/ChatMessage.jsx"), /onTouchStart=\{startPress\}/);
  assert.match(source("features/social/messaging/ChatMessage.jsx"), /onClick=\{revealTouchActions\}/);
});

test("Media bubbles use a slim neutral border and composer buttons have 44px targets", () => {
  assert.match(source("features/social/messaging/ChatMessage.jsx"), /isMediaOnly \? "border border-line bg-surface p-1/);
  const composer = source("features/social/messaging/ChatComposer.jsx");
  assert.match(composer, /className="grid size-11/);
  assert.match(composer, /!border-line-strong/);
});

test("Message ordering is chronological regardless of backend page order", () => {
  const older = { _id: "one", createdAt: "2026-11-10T01:00:00Z" };
  const newer = { _id: "two", createdAt: "2026-11-10T02:00:00Z" };
  const data = { pages: [{ items: [newer] }, { items: [older] }] };
  assert.deepEqual(messagesInChronologicalOrder(data).map((item) => item._id), ["one", "two"]);
  assert.deepEqual(messagesInChronologicalOrder(mergeMessage(data, newer)).map((item) => item._id), ["one", "two"]);
});
