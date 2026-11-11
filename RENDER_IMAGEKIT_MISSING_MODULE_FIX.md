# AEVORA Render fix: `ERR_MODULE_NOT_FOUND` for `src/storage/imagekit.js`

## Root cause

The previous deployment ZIP mistakenly excluded `server/src/storage/` (application source code) because three ignore files treated **every** directory named `storage` as runtime upload data:

- `.gitignore` used `**/storage/`.
- `server/.gitignore` used `storage/`.
- `.dockerignore` used `**/storage`.

This prevented the ImageKit adapter and related files from being uploaded to GitHub and/or copied into the Docker image. It is unrelated to your ImageKit credentials.

## Fix included in this archive

1. Restored `server/src/storage/imagekit.js`, `imagekitPaths.js`, and `r2.js`.
2. Changed root `.gitignore`, nested `server/.gitignore`, and `.dockerignore` to ignore only runtime upload directories (`server/storage` and root `storage`), not `server/src/storage`.
3. Added Dockerfile build checks so missing storage modules fail the Docker build early.
4. Added regression tests at `server/test/deploymentStorageFiles.test.js`.

## Apply to an existing GitHub checkout on Windows

Extract this corrected ZIP to a separate folder. In your already-connected GitHub working directory, copy the three `server/src/storage/*.js` files from the corrected ZIP into the identical path. Replace the three ignore files and `Dockerfile` with the corrected versions.

Then open PowerShell in your existing Git checkout and run:

```powershell
git status --short
git add .gitignore .dockerignore server/.gitignore Dockerfile server/src/storage/imagekit.js server/src/storage/imagekitPaths.js server/src/storage/r2.js server/test/deploymentStorageFiles.test.js
git commit -m "Fix ImageKit source files excluded from Render deploy"
git push origin main
```

Make sure the three storage source files appear in the GitHub repository under `server/src/storage/`. If your deployment uses a branch other than `main`, push that branch instead.

Render automatically deploys new commits when auto-deploy is enabled. Otherwise go to Render > your web service > Manual Deploy > Deploy latest commit.

You do not need to change MongoDB Atlas, ImageKit keys, or Better Auth settings for this particular error.

## Verify

On Windows in your project folder:

```powershell
Test-Path .\server\src\storage\imagekit.js
Test-Path .\server\src\storage\imagekitPaths.js
Test-Path .\server\src\storage\r2.js
git check-ignore -v server/src/storage/imagekit.js
node --test server/test/deploymentStorageFiles.test.js
```

All three `Test-Path` commands should output `True`. `git check-ignore` should show **no match** for `imagekit.js`. The tests should pass.

After the Render rebuild, `ERR_MODULE_NOT_FOUND` for `server/src/storage/imagekit.js` should no longer occur. Other runtime and third-party integration errors are independent and still need to be tested after deployment.
