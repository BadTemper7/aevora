import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const discovery = readFileSync(new URL("../src/features/communities/pages/CommunityDiscoveryPage.jsx", import.meta.url), "utf8");
const visuals = readFileSync(new URL("../src/features/communities/components/CommunityVisuals.jsx", import.meta.url), "utf8");

test("The shared community card floats its avatar above the positioned banner", () => {
  assert.match(discovery, /function CommunityCard\(/);
  assert.match(discovery, /<Banner community=\{community\}/);
  assert.match(discovery, /<div className="relative flex flex-1 flex-col gap-3 px-4 pb-4">/);
  assert.match(discovery, /className="relative z-10 -mt-7 shadow-lg ring-4 ring-surface"/);
  assert.match(discovery, /<CommunityCard key=\{c\.id\} community=\{c\} compact/);
  assert.match(discovery, /<CommunityCard\s+key=\{c\.id\}\s+community=\{c\}\s+onJoin=/);
});

test("Card logos use contain while other avatar images preserve cover by default", () => {
  assert.match(discovery, /imageFit="contain"/);
  assert.match(visuals, /imageFit = "cover"/);
  assert.match(visuals, /imageFit === "contain" \? "object-contain" : "object-cover"/);
  assert.match(visuals, /overflow-hidden bg-brand-soft/);
});
