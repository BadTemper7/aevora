import test from "node:test";
import assert from "node:assert/strict";
import { mergeMessage, hideMessage, markMessageFailed, markReceipt, messageDeliveryState, messagesInChronologicalOrder, updateMessage } from "../src/features/social/messaging/messageCache.js";

const blank = { pages: [{ items: [], nextCursor: null }], pageParams: [null] };
const fake = (clientId, _id = `pending:${clientId}`, offset = 0) => ({
  _id, clientId, senderId: "alice", text: `Message ${clientId}`, kind: "text", createdAt: new Date(1730000000000 + offset).toISOString(),
  sendingState: String(_id).startsWith("pending:") ? "sending" : undefined, deliveredTo: ["alice"], readBy: ["alice"], reactions: [],
});
test("optimistic send appears immediately and HTTP/socket copies reconcile by stable clientId", () => {
  const pending = fake("abc");
  const cache = mergeMessage(blank, pending);
  assert.equal(cache.pages[0].items.length, 1);
  assert.equal(messageDeliveryState(cache.pages[0].items[0], ["bob"]), "sending");
  const saved = fake("abc", "507f1f77bcf86cd799439011");
  const afterSocket = mergeMessage(cache, saved);
  const afterHttp = mergeMessage(afterSocket, saved);
  assert.equal(afterHttp.pages[0].items.length, 1);
  assert.equal(afterHttp.pages[0].items[0]._id, saved._id);
  assert.equal(messageDeliveryState(afterHttp.pages[0].items[0], ["bob"]), "sent");
});
test("read requires a read event, not merely delivery or online presence", () => {
  const sent = fake("abc", "507f1f77bcf86cd799439011");
  const one = mergeMessage(blank, sent);
  const delivered = markReceipt(one, { type: "delivery", userId: "bob", messageId: sent._id });
  assert.equal(messageDeliveryState(delivered.pages[0].items[0], ["bob"]), "delivered");
  const seen = markReceipt(delivered, { type: "read", userId: "bob", readAt: new Date(1730000005000).toISOString() });
  assert.equal(messageDeliveryState(seen.pages[0].items[0], ["bob"]), "seen");
  assert.equal(seen.pages[0].items[0].deliveredTo.filter((id) => id === "bob").length, 1);
});
test("group message only shows full delivered or seen when all recipients acknowledge", () => {
  const sent = fake("abc", "507f1f77bcf86cd799439011");
  const cache = markReceipt(mergeMessage(blank, sent), { type: "delivery", userId: "bob", messageId: sent._id });
  assert.equal(messageDeliveryState(cache.pages[0].items[0], ["bob", "charlie"]), "sent");
  const all = markReceipt(cache, { type: "delivery", userId: "charlie", messageId: sent._id });
  assert.equal(messageDeliveryState(all.pages[0].items[0], ["bob", "charlie"]), "delivered");
});
test("failed message can be retried with its original clientId", () => {
  const cache = markMessageFailed(mergeMessage(blank, fake("abc")), "abc");
  assert.equal(messageDeliveryState(cache.pages[0].items[0], ["bob"]), "failed");
  const retry = mergeMessage(cache, { ...fake("abc"), sendingState: "sending" });
  assert.equal(retry.pages[0].items.length, 1);
  assert.equal(messageDeliveryState(retry.pages[0].items[0], ["bob"]), "sending");
});
test("rapid messages sort stably; reconnect duplicates don't appear", () => {
  let cache = mergeMessage(blank, fake("c", "pending:c", 20));
  cache = mergeMessage(cache, fake("a", "pending:a", 0));
  cache = mergeMessage(cache, fake("b", "pending:b", 10));
  cache = mergeMessage(cache, fake("b", "507f1f77bcf86cd799439014", 10));
  cache = mergeMessage(cache, fake("a", "507f1f77bcf86cd799439012", 0));
  const msgs = messagesInChronologicalOrder(cache);
  assert.deepEqual(msgs.map((m) => m.clientId), ["a", "b", "c"]);
});
test("delete for me hides only viewer cache and edit or pin preserves the message ID", () => {
  const data = mergeMessage(blank, fake("abc", "507f1f77bcf86cd799439011"));
  const edited = updateMessage(data, data.pages[0].items[0]._id, { text: "Edited", pinnedAt: new Date().toISOString() });
  assert.equal(edited.pages[0].items[0].text, "Edited");
  assert.equal(edited.pages[0].items[0]._id, data.pages[0].items[0]._id);
  assert.equal(hideMessage(edited, data.pages[0].items[0]._id).pages[0].items.length, 0);
  assert.equal(data.pages[0].items.length, 1);
});
