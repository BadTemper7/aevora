# Deploy AEVORA on a free host (November 2026)

This deployment kit is based on `aevora_instagram_style_stories_full_project.zip`.
The React client, Express REST API, Better Auth, Socket.IO, MongoDB models,
ImageKit media processing, and LiveKit integration are preserved.

## Which option?

| Option | Cost | Best for | Critical limitation |
| --- | --- | --- | --- |
| Render Free, one Docker web service | $0 within platform allowance | Demo: login, profiles, communities, messaging | Service sleeps after 15 minutes without traffic. Mandatory ClamAV scanning requires > 512 MB, so new uploads fail closed unless a compatible scanner service is provided. Background jobs do not run during sleep. |
| Oracle Cloud Always Free Ampere A1 | $0 when eligible and within Always Free allocation | Longer-running prototype with file uploads and ClamAV | Harder setup; ARM VM capacity may be unavailable. VM can be reclaimed if idle, no SLA. Requires billing-card verification. |

**Do not remove the malware scan requirement to make a free deployment work.**
For the complete Stories/video/media experience, prefer the Oracle path.

## Important changes made

- `server/src/productionClient.js` now serves the Vite build on the same origin as `/api` and `/socket.io` in production.
- `Dockerfile` builds React, installs Express dependencies, FFmpeg/FFprobe, and the ClamAV scanning client.
- `render.yaml` is an optional Render Free blueprint for the demo mode.
- `docker-compose.oracle.yml` runs the app, the official ClamAV daemon, and Caddy HTTPS on Oracle A1.
- `deploy/clamdscan-remote.sh` safely streams file bytes to the separate ClamAV service without weakening the existing production scan policy.
- Client visual source files, authentication, MongoDB schemas, ImageKit storage, and LiveKit code are unchanged.

## Shared prerequisites

1. Create a **private GitHub repository** and push the contents of the `aevora` directory. Keep `.env` and `.env.production` out of Git.
2. Set up MongoDB Atlas (existing M0 free cluster is fine for a pilot) and copy the SRV URI.
3. Set up ImageKit and obtain `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_PUBLIC_KEY`, and `IMAGEKIT_URL_ENDPOINT`.
4. For voice/video/screensharing, configure LiveKit's room URL and API credentials. Free-plan quotas vary.
5. For Google sign-in, configure an OAuth Web Application client in Google Cloud.
6. Generate a fresh random 32+ character `BETTER_AUTH_SECRET`; don't reuse a local testing secret for a public deployment.

The frontend intentionally uses relative `/api` paths and same-origin Socket.IO by default. Do not set `VITE_API_URL`, `VITE_AUTH_URL`, or `VITE_SOCKET_URL` for these one-origin deployments.

## Route A: Fast demo on Render Free

1. Open https://dashboard.render.com/ and choose **New > Web Service**. Connect your GitHub repo.
2. Select **Docker**, set **Dockerfile Path** to `./Dockerfile`, choose the **Free** plan, optionally region Singapore, and pick a unique app name such as `aevora-preview-123`.
3. Note the generated URL such as `https://aevora-preview-123.onrender.com`.
4. In **Environment**, set:

   ```env
   NODE_ENV=production
   PORT=10000
   CLIENT_URL=https://aevora-preview-123.onrender.com
   BETTER_AUTH_URL=https://aevora-preview-123.onrender.com
   BETTER_AUTH_SECRET=YOUR_RANDOM_SECRET
   MONGODB_URI=YOUR_ATLAS_CONNECTION_STRING
   STORAGE_PROVIDER=imagekit
   IMAGEKIT_PRIVATE_KEY=YOUR_IMAGEKIT_PRIVATE_KEY
   IMAGEKIT_PUBLIC_KEY=YOUR_IMAGEKIT_PUBLIC_KEY
   IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/YOUR_IMAGEKIT_ID
   VIDEO_WORKER_CONCURRENCY=1
   VIDEO_MAX_HEIGHT=720
   MAX_VIDEO_MB=25
   IMAGEKIT_CLEANUP_ENABLED=false
   ```

   Optional: set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, and public build-time `VITE_GIPHY_API_KEY` as required.
5. In Atlas **Security > Network Access**, add the outbound IP ranges shown in Render's **Connect > Outbound** for your service. Avoid blanket `0.0.0.0/0` when allowlisting is possible. Ensure the MongoDB user has limited permissions.
6. In Google Cloud Console, add the exact authorized JavaScript origin (`https://aevora-preview-123.onrender.com`) and redirect URI (`https://aevora-preview-123.onrender.com/api/auth/callback/google`). Configure test users while the OAuth consent screen is in testing.
7. Deploy. Open `https://aevora-preview-123.onrender.com/api/health` to confirm JSON status, then open the root to test the UI.

**Warning:** Render Free has 512 MB RAM and idles after 15 minutes. AEVORA intentionally requires ClamAV for untrusted uploads in production. This Docker image includes only the scanning client, not the memory-heavy daemon. Therefore image, video, music, and document uploads return an explicit error until an external ClamAV service is configured. Do not disable scanning for a public release. Chat, account and social metadata can still be tested. Socket.IO and background reminders won't be continuously available while asleep.

`render.yaml` can optionally be used via Render > New > Blueprint, but you still must set the final generated domain in `CLIENT_URL` and `BETTER_AUTH_URL`.

## Route B: More complete free prototype on Oracle Cloud Always Free

As of November 2026 Oracle's Always Free Ampere allocation is **2 OCPUs and 12 GB RAM total**, not the older 4/24 figures. Create a VM.Standard.A1.Flex instance **within** this 2 OCPU / 12 GB allocation with Ubuntu 24.04 in your home region. It may be unavailable due to capacity. Avoid resources labeled Paid or Trial-only, especially after trial expiry.

1. In Oracle Cloud create an Ampere A1 Always Free VM, 2 OCPU/12 GB, public IPv4, add SSH key. Use an Always Free-eligible boot volume (approximately 50 GB). Restrict SSH to your own IP. In the VM VCN ingress rules allow TCP ports **80** and **443** for HTTPS, and configure Ubuntu's firewall appropriately. Never expose app port 10000 or ClamAV port 3310 publicly.
2. Create a free DNS name (for example a DuckDNS subdomain) pointing to the VM's public IP. Update `Caddyfile` with that name. HTTPS certificates require DNS to resolve correctly and ports 80/443 to be reachable.
3. SSH to the instance and install Docker with its Compose plugin per official Ubuntu/Docker instructions. Clone your private AEVORA GitHub repository to the VM.
4. From your repository root, create production settings **locally on the VM**:

   ```sh
   cp .env.production.example .env.production
   nano .env.production
   ```

   Fill in MongoDB, ImageKit, Better Auth, LiveKit, Google credentials and set `CLIENT_URL` and `BETTER_AUTH_URL` to exactly your `https://yourname.duckdns.org` URL. Do not commit this file.
5. Set the optional public GIF key for frontend build (the browser key will be visible to site users): `export VITE_GIPHY_API_KEY=...`. You can omit it initially.
6. Launch the stack:

   ```sh
   sudo docker compose -f docker-compose.oracle.yml up -d --build
   sudo docker compose -f docker-compose.oracle.yml logs -f --tail=100
   ```

   The `clamav` container downloads signature databases on first start. **Wait for it to be ready** before testing uploads; scans fail closed until the daemon is available.
7. In Atlas Network Access, allowlist the Oracle VM's outgoing public IP. Update Google OAuth authorized origin and redirect URI as in the Render instructions, using your HTTPS domain. For LiveKit, set the webhook URL to `https://yourname.duckdns.org/api/livekit/webhook` if your instance uses LiveKit webhooks.
8. Check `https://yourname.duckdns.org/api/health`, register a new test account, upload one small image, then test two-account messaging and voice.

**ClamAV security:** The uploaded file never bypasses the `scanUploadedFile` check. The app container invokes `clamdscan --stream` over the internal Compose network; port 3310 is not published to the internet. An unavailable scanner blocks uploads.

**Oracle caveats:** Always Free VMs can be reclaimed if sufficiently idle. Keep within all free quotas and monitor usage. Running two OCPUs, ClamAV and FFmpeg can still be slow for lengthy videos. This is a small-project setup, not an availability or security guarantee. Take independent backups and keep VM patches/ClamAV signatures current.

## Key URLs and configuration

| Feature | URL to use |
| --- | --- |
| Site | `https://YOUR_HOST/` |
| API health | `https://YOUR_HOST/api/health` |
| Google Authorized origin | `https://YOUR_HOST` |
| Google OAuth redirect URI | `https://YOUR_HOST/api/auth/callback/google` |
| LiveKit webhook | `https://YOUR_HOST/api/livekit/webhook` |
| WebSocket/Socket.IO | `https://YOUR_HOST/socket.io` (automatically same origin) |

## Post-deploy checklist

- [ ] App root shows the React UI.
- [ ] `/api/health` returns JSON 200.
- [ ] MongoDB connection completes and no Atlas TLS errors appear in server logs.
- [ ] A new email/password user can register and log in.
- [ ] Google popup works and returns to the same-origin AEVORA registration flow.
- [ ] The same user stays logged in after refresh.
- [ ] Two accounts exchange messages without manual refresh.
- [ ] Chat and communities authenticate over Socket.IO.
- [ ] (Oracle) ClamAV scan passes, ImageKit shows one optimized test image.
- [ ] (Oracle) Story photo/video and voice/screen-share work with two users.
- [ ] Refreshing deep links such as `/register`, `/messages`, and community routes loads React, not a 404.
- [ ] Check browser DevTools Network / Console for errors, and inspect server logs.

## Operational limitations

- This packaging was source-checked, but actual hosted deployment, Docker image build, MongoDB and LiveKit integration still need end-to-end verification with your credentials.
- Free providers and credits may change without notice. ImageKit, Atlas, LiveKit and any GIF or licensing services have their own usage terms/quotas. A free cloud VM does not make all connected services unlimited.
- The worker is in the same server process. It runs while Oracle VM is healthy but stops during Render Free sleep; background queues may resume after restart, and some timers may not fire on time. High-reliability media processing eventually needs a durable queue, independent workers, and monitoring.
- AEVORA's audio/music feature requires uploads of original or authorized tracks, not an unlicensed commercial library.
