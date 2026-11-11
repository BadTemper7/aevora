import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (relative) =>
  readFileSync(new URL(`../src/${relative}`, import.meta.url), "utf8");

test("Both community screens share a clean header with only brand and theme control", () => {
  const layout = source("layouts/CommunityLayout.jsx");
  assert.match(layout, /<Logo size="sm"/);
  assert.match(layout, /<ThemeToggle\s*\/>/);
  assert.match(layout, /<Outlet\s*\/>/);
  assert.doesNotMatch(layout, /<ArrowLeft|<MobileNav|<NavLink/);
  assert.doesNotMatch(layout, /Community navigation|Back to AEVORA Home/);
});

test("Community discovery no longer reserves space for a mobile bottom bar", () => {
  const page = source("features/communities/pages/CommunityDiscoveryPage.jsx");
  assert.match(page, /overflow-y-auto px-3 pb-6 pt-4/);
  assert.doesNotMatch(page, /pb-28/);
});

test("Detail page gives all four community sections equal mobile width", () => {
  const page = source("features/communities/pages/CommunityPage.jsx");
  assert.match(page, /\["channel", "Spaces"/);
  assert.match(page, /\["events", "Events"/);
  assert.match(page, /\["invites", "Invites"/);
  assert.match(page, /\["settings", "Settings"/);
  assert.match(page, /aria-label="Community sections"/);
  assert.match(page, /grid grid-cols-4 gap-1/);
  assert.match(page, /min-h-12 min-w-0 flex-col/);
  assert.match(page, /whitespace-nowrap/);
  assert.match(page, /onClick=\{\(\) => setView\(value\)\}/);
  assert.match(page, /aria-current=\{view === value/);
  assert.doesNotMatch(page, /sm:order-none sm:w-auto/);
});

test("Community content has flexible scrolling height now that tabs are in a separate row", () => {
  const layout = source("layouts/CommunityLayout.jsx");
  const page = source("features/communities/pages/CommunityPage.jsx");
  assert.match(layout, /h-dvh min-h-0 flex-col overflow-hidden/);
  assert.match(layout, /flex-1 overflow-hidden/);
  assert.match(page, /flex min-h-0 flex-1 gap-3 p-3/);
  assert.match(page, /relative mx-3 mb-3 grid grid-cols-4/);
});
