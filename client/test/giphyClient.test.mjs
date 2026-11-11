import assert from "node:assert/strict";
import test from "node:test";
import { toGif } from "../src/features/social/messaging/giphyClient.js";

test("GIPHY media items preserve animated CDN renditions and source ids", () => {
  const result = toGif({ id: "abc123", title: "Happy reaction", images: {
    downsized: { url: "https://media1.giphy.com/media/abc123/giphy.gif" },
    fixed_width_small: { url: "https://media1.giphy.com/media/abc123/100w.gif" },
  } });
  assert.equal(result.id, "abc123");
  assert.equal(result.source, "giphy");
  assert.match(result.previewUrl, /100w.gif$/);
});
test("Only secure GIPHY media URLs are displayed", () => {
  assert.equal(toGif({ id: "abc123", images: { downsized: { url: "javascript:alert(1)" } } }), null);
  assert.equal(toGif({ id: "abc123", images: { downsized: { url: "https://fake.example/giphy.gif" } } }), null);
});
