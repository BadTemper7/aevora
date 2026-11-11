import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

import {
  GOOGLE_POPUP_KEY_PREFIX,
  GOOGLE_POPUP_MESSAGE_TYPE,
  openGooglePopup,
} from "../src/features/auth/api/googlePopup.js";

function makeBrowser({ blocked = false } = {}) {
  const listeners = new Map();
  const storage = new Map();
  const popup = {
    closed: false,
    document: { title: "", body: { innerHTML: "" } },
    location: { url: "", replace(url) { this.url = url; } },
    close() { this.closed = true; },
  };
  const browser = {
    screenX: 0,
    screenY: 0,
    outerWidth: 1400,
    outerHeight: 900,
    crypto: { randomUUID: () => "flow-123" },
    location: { origin: "http://localhost:5173" },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key),
    },
    open: () => blocked ? null : popup,
    addEventListener(name, fn) {
      const bucket = listeners.get(name) ?? new Set();
      bucket.add(fn);
      listeners.set(name, bucket);
    },
    removeEventListener(name, fn) { listeners.get(name)?.delete(fn); },
    emit(name, event) { for (const fn of listeners.get(name) ?? []) fn(event); },
  };
  return { browser, popup, listeners, storage };
}

function sendSuccess(browser) {
  browser.emit("message", {
    origin: "http://localhost:5173",
    data: { type: GOOGLE_POPUP_MESSAGE_TYPE, flow: "flow-123", status: "success" },
  });
}

test("opens synchronously, uses normal social OAuth and waits for verified session", async () => {
  const { browser, popup } = makeBrowser();
  globalThis.window = browser;
  let callbackURL;
  let verified = 0;
  const task = openGooglePopup({
    requestAuthorization: async (urls) => {
      callbackURL = urls.callbackURL;
      return { data: { url: "https://accounts.google.com/mock" } };
    },
    fetchSession: async () => { verified++; return { user: { username: "alice" }, session: { id: "1" } }; },
  });
  assert.match(popup.document.body.innerHTML, /Connecting to Google/);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(popup.location.url, "https://accounts.google.com/mock");
  assert.equal(new URL(callbackURL).pathname, "/google-auth-complete.html");
  assert.equal(new URL(callbackURL).searchParams.get("flow"), "flow-123");
  sendSuccess(browser);
  const session = await task;
  assert.equal(session.user.username, "alice");
  assert.equal(verified, 1);
  assert.equal(popup.closed, true);
  delete globalThis.window;
});

test("does not interpret a false popup.closed as Google cancellation", async () => {
  const { browser, popup } = makeBrowser();
  globalThis.window = browser;
  const task = openGooglePopup({
    requestAuthorization: async () => ({ data: { url: "https://accounts.google.com/mock" } }),
    fetchSession: async () => ({ user: { username: null }, session: { id: "2" } }),
  });
  await new Promise((resolve) => setImmediate(resolve));
  popup.closed = true; // Chrome/Brave can report this during cross-origin navigation.
  sendSuccess(browser);
  assert.equal((await task).session.id, "2");
  delete globalThis.window;
});

test("storage event delivers popup completion if Google severs window.opener", async () => {
  const { browser } = makeBrowser();
  globalThis.window = browser;
  const task = openGooglePopup({
    requestAuthorization: async () => ({ data: { url: "https://accounts.google.com/mock" } }),
    fetchSession: async () => ({ user: { username: "alice" }, session: { id: "3" } }),
  });
  browser.emit("storage", {
    key: `${GOOGLE_POPUP_KEY_PREFIX}flow-123`,
    newValue: JSON.stringify({ type: GOOGLE_POPUP_MESSAGE_TYPE, flow: "flow-123", status: "success" }),
  });
  assert.equal((await task).session.id, "3");
  delete globalThis.window;
});

test("ignores wrong origin and flow id", async () => {
  const { browser } = makeBrowser();
  globalThis.window = browser;
  let verified = 0;
  const task = openGooglePopup({
    requestAuthorization: async () => ({ data: { url: "https://accounts.google.com/mock" } }),
    fetchSession: async () => { verified++; return { user: {}, session: { id: "4" } }; },
  });
  const payload = { type: GOOGLE_POPUP_MESSAGE_TYPE, flow: "flow-123", status: "success" };
  browser.emit("message", { origin: "https://attacker.example", data: payload });
  browser.emit("message", { origin: browser.location.origin, data: { ...payload, flow: "wrong" } });
  assert.equal(verified, 0);
  sendSuccess(browser);
  await task;
  assert.equal(verified, 1);
  delete globalThis.window;
});

test("reports blocked popups and server authorization errors", async () => {
  const { browser } = makeBrowser({ blocked: true });
  globalThis.window = browser;
  await assert.rejects(openGooglePopup(), /blocked/);
  const openBrowser = makeBrowser();
  globalThis.window = openBrowser.browser;
  await assert.rejects(openGooglePopup({
    requestAuthorization: async () => ({ error: { message: "Invalid client ID" } }),
    fetchSession: async () => ({}),
  }), /Invalid client ID/);
  delete globalThis.window;
});

test("cancels correctly without reporting POPUP_CLOSED", async () => {
  const { browser, popup } = makeBrowser();
  globalThis.window = browser;
  const controller = new AbortController();
  const task = openGooglePopup({
    requestAuthorization: async () => ({ data: { url: "https://accounts.google.com/mock" } }),
    fetchSession: async () => ({}),
    signal: controller.signal,
  });
  controller.abort();
  await assert.rejects(task, { name: "AbortError" });
  assert.equal(popup.closed, true);
  delete globalThis.window;
});

test("static OAuth completion page sends only a status and nonce, not tokens", () => {
  const html = readFileSync(new URL("../public/google-auth-complete.html", import.meta.url), "utf8");
  const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  const sent = [];
  const stored = [];
  const ids = new Map([["title", { textContent: "" }], ["message", { textContent: "" }]]);
  const browser = {
    location: { search: "?flow=flow-123", origin: "http://localhost:5173" },
    opener: { postMessage: (payload, origin) => sent.push({ payload, origin }) },
    close() {},
  };
  class Channel {
    postMessage(payload) { sent.push({ payload, origin: "broadcast" }); }
    close() {}
  }
  vm.runInNewContext(script, {
    window: browser,
    document: { getElementById: (id) => ids.get(id) },
    localStorage: { setItem: (key, value) => stored.push({ key, value }) },
    BroadcastChannel: Channel,
    URLSearchParams,
    setTimeout: () => {},
  });
  assert.equal(sent[0].origin, browser.location.origin);
  assert.equal(sent[0].payload.status, "success");
  assert.equal(sent[0].payload.flow, "flow-123");
  assert.equal(stored.length, 1);
  assert.doesNotMatch(JSON.stringify(sent), /access_token|session_token|refresh_token/);
});
