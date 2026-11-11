import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = (p)=>readFileSync(new URL(`../${p}`, import.meta.url),'utf8');
test('story rail reuses its original design and embeds the new editor and viewer',()=>{
  const rail=source('src/features/social/feed/components/StoryRail.jsx');
  assert.match(rail,/bg-gradient-to-tr/);
  assert.match(rail,/StoryEditor/);
  assert.match(rail,/StoryViewer/);
  assert.match(rail,/queryKey:\['stories'\]/);
});
test('story composer waits for media optimization before batch publication',()=>{
  const editor=source('src/features/social/feed/stories/StoryEditor.jsx');
  const upload=editor.indexOf('await uploadMedia(current.file');
  const ready=editor.indexOf('await waitForMedia(mediaId');
  const published=editor.indexOf("await create('/stories/batch'");
  assert.ok(upload>=0 && ready>upload && published>ready);
  assert.match(editor,/onPublished/);
  assert.match(editor,/controller.signal/);
  assert.match(editor,/Cancel upload/);
  assert.match(editor,/trimStart/);
});
test('music picker uses authorized music API rather than unlicensed streaming catalogs',()=>{
  const picker=source('src/features/social/feed/stories/StoryMusicPicker.jsx');
  assert.match(picker,/story-music/);
  assert.match(picker,/rightsConfirmed/);
  assert.match(picker,/Clip starts/i);
  assert.doesNotMatch(picker,/spotify\.com|youtube\.com/);
});
test('viewer supports live sticker responses, audio playback, and advancing slides',()=>{
  const viewer=source('src/features/social/feed/stories/StoryViewer.jsx');
  assert.match(viewer,/stickers\/\$\{layer.id\}\/respond/);
  assert.match(viewer,/setElapsed/);
  assert.match(viewer,/onAddYours/);
  assert.match(viewer,/audioRef/);
});
