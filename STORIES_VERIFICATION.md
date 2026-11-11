# AEVORA Stories: release verification

**Build date:** November 10, 2026
**Source:** latest available AEVORA ImageKit attachment-composer project ZIP, updated in place.

## Checks performed

| Check | Result | Notes |
| --- | --- | --- |
| Existing client regression suite | **60 passed** | Node source-level regression suite, includes four new story contracts |
| Available backend dependency-free regression suite | **27 passed** | Includes six new story contracts |
| JavaScript/JSX source parsing | **225 files passed** | Parsed by TypeScript JS/JSX parser; not a complete Vite build |
| Relative source import references | **541 resolved** | Relative imports only; package imports require `npm install` |
| Original file-preservation comparison | **0 removed** | 11 added and 13 modified vs. previous ZIP; homepage, client navigation, CSS and chat layout unchanged |
| Video FFmpeg smoke test | **Passed** | Generated 8-second H.264/AAC sample; requested trim output was 3.0s, H.264/AAC MP4 |
| Audio FFmpeg smoke test | **Passed** | Generated 8-second WAV source 705,678 bytes; optimized AAC M4A 98,832 bytes |
| Live ImageKit upload/playback | **Not tested** | Requires deployment credentials, SDK installation and actual network |
| MongoDB TTL and sticker interactions | **Not tested live** | Requires database and two authenticated accounts |
| Browser permission/camera/music playback | **Not tested live** | Requires supported browsers and HTTPS or localhost |
| Full npm dependency install and Vite build | **Not tested** | Registry access unavailable in authoring environment |

The short synthetic video file was smaller partly **because it was trimmed from 8 seconds to 3 seconds**; this cannot be interpreted as the general compression ratio for arbitrary videos.

## Main risks to test before public launch

1. **Licensed music:** rights confirmations must be backed by catalog moderation/takedown procedures. Do not add commercial music from streaming services merely because it is streamable.
2. **Private story media:** verify profile/friend/follow audiences using three accounts, including block cases, and that private ImageKit object access is denied without an authorized session.
3. **Concurrent media processing:** simulate retries, failed transcoding, upload cancellation and dashboard quota limits before permitting unrestricted public uploads.
4. **Viewer rendering:** verify the story's CSS overlays and selected music excerpt on iOS Safari, Android Chrome, Brave and desktop. Some browsers restrict autoplay audio until a user interacts.
5. **Countdown notifications:** check worker idempotence with two backend instances and ensure deployment uses the correct notification types.
6. **Index/TTL:** verify MongoDB's background TTL removal and that deletion of active sticker/audio assets is refused.

Do not characterize this archive as production-certified until the live tests in `STORIES_TEST_PLAN.md` pass.
