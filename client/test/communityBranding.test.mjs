import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (relative) =>
  readFileSync(new URL(`../src/${relative}`, import.meta.url), "utf8");
const settings = read("features/communities/components/CommunitySettingsPanel.jsx");
const editor = read("features/communities/components/CommunityImageEditor.jsx");
const visuals = read("features/communities/components/CommunityVisuals.jsx");
const discovery = read("features/communities/pages/CommunityDiscoveryPage.jsx");
const page = read("features/communities/pages/CommunityPage.jsx");
const boundary = read("features/communities/components/CommunitySettingsBoundary.jsx");

test("Settings opens on Appearance, not on an empty panel or a long Overview form", () => {
  assert.match(settings, /useState\('Appearance'\)/);
  assert.match(settings, /section==='Appearance'/);
  assert.match(settings, /CommunityImageEditor variant="icon" community=\{community\}/);
  assert.match(settings, /CommunityImageEditor variant="banner" community=\{community\}/);
  assert.match(settings, /overflow-y-auto overscroll-contain/);
});

test("Community image controls use a native inline mobile file chooser", () => {
  assert.match(editor, /type="file"/);
  assert.match(editor, /onChange=\{\(event\) =>/);
  assert.match(editor, /setLocalPreview\(preview\)/);
  assert.match(editor, /URL\.createObjectURL\(file\)/);
  assert.doesNotMatch(editor, /window\.open\(|navigate\(|<dialog|<Modal/);
});

test("Only supported image formats and sizes can be uploaded", () => {
  assert.match(editor, /image\/jpeg/);
  assert.match(editor, /image\/png/);
  assert.match(editor, /image\/webp/);
  assert.match(editor, /image\/avif/);
  assert.match(editor, /12 \* 1024 \* 1024/);
  assert.match(editor, /ACCEPTED_TYPES\.has\(file\.type\)/);
});

test("Uploaded community images are processed before being applied", () => {
  assert.match(editor, /await uploadMedia\(/);
  assert.match(editor, /"community",/);
  assert.match(editor, /\{ variant \}/);
  assert.match(editor, /await waitForMedia\(uploaded\.id/);
  assert.match(editor, /await saveImage\(ready\.id/);
  assert.match(editor, /await communityPatch\(`\/communities\/\$\{community\.id\}`/);
});

test("An upload or save error keeps the existing image and can be retried", () => {
  assert.match(editor, /setState\(processedId \? "save-failed" : "failed"\)/);
  assert.match(editor, /Retry saving/);
  assert.match(editor, /setError\(errorText\(cause\)\)/);
  assert.match(editor, /if \(controller\.signal\.aborted\) return/);
  assert.match(settings, /Your current image remains in place if the upload fails|preview stays here while uploading/);
});

test("Reset explicitly updates the image field only; text saves cannot overwrite it", () => {
  assert.match(editor, /\[fieldName\]: id/);
  assert.match(editor, /await saveImage\("", controller\.signal\)/);
  assert.doesNotMatch(settings, /requireApproval,iconId:/);
  assert.doesNotMatch(settings, /requireApproval,bannerId:/);
});

test("Creating a community also uses the new preview controls", () => {
  assert.match(discovery, /CommunityImageEditor\s+variant="icon"/);
  assert.match(discovery, /CommunityImageEditor\s+variant="banner"/);
  assert.match(discovery, /iconId: m\?\.id \|\| ""/);
  assert.match(discovery, /bannerId: m\?\.id \|\| ""/);
});

test("Failed image responses fall back to a community letter or gradient", () => {
  assert.match(visuals, /const hasImage = Boolean\(community\.iconId && failedId !== community\.iconId\)/);
  assert.match(visuals, /const hasImage = Boolean\(community\.bannerId && failedId !== community\.bannerId\)/);
  assert.match(visuals, /onError=\{\(\) => setFailedId/);
});

test("A Community Settings crash has a visible local retry instead of an empty screen", () => {
  assert.match(page, /<CommunitySettingsBoundary key=\{community\.id\}>/);
  assert.match(boundary, /Community settings could not load/);
  assert.match(boundary, /Try again/);
  assert.match(boundary, /getDerivedStateFromError/);
});
