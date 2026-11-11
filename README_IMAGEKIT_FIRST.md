# AEVORA: ImageKit Storage Edition

Start with `IMAGEKIT_SETUP_AND_MIGRATION.md`. Cloudflare R2 is no longer the destination for new media. **ImageKit storage is enabled only after you set real credentials in `server/.env`.** Original client layout and existing media APIs are preserved.

- `server/.env.example` (complete AEVORA backend variables)
- `server/.env.imagekit.example` (ImageKit-only variables)
- `client/.env.example` (public client settings only)
- `IMAGEKIT_CHANGED_FILES.md` (exact source changes)
- `IMAGEKIT_VERIFICATION_REPORT.md` (tests and limitations)

ImageKit API keys should never be included in a shared archive. Legacy R2 credentials, if needed for old media, remain optional and server-side only.
