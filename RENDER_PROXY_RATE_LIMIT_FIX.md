# AEVORA Render proxy and rate-limit fix

## Problem

Render sits in front of Express. Requests can carry `X-Forwarded-For`, but the old
Express app did not trust the reverse proxy. Better Auth could not reliably
resolve a client IP, and express-rate-limit's default key sometimes became
undefined. Draft-8 header generation then raised `ERR_INVALID_ARG_TYPE`.

## Changes

- `server/src/config/env.js`: `TRUST_PROXY_HOPS` defaults to `1` in production,
  `0` in development, and is limited to 0-5.
- `server/src/app.js`: set Express proxy trust BEFORE routes and resolve a
  validated client IP. Overwrite `x-aevora-client-ip` on each request.
- `server/src/network/trustedClientIp.js`: shared validated IP resolution for
  HTTP and Socket.IO, using the configured proxy hop count.
- `server/src/lib/auth.js`: Better Auth reads only the server-generated IP header.
- `server/src/social/rateLimit.js`: authenticated social and upload limits use
  `req.user.id`; independent of proxy address resolution.
- `server/src/realtime/socketServer.js`: sets validated client IP for Socket.IO
  session checks (Socket.IO bypasses Express middleware).

## Deploy

1. Copy the updated code into your GitHub-connected checkout. Keep `.git` and
   your real `.env` outside version control.
2. In Render set `NODE_ENV=production` and optionally `TRUST_PROXY_HOPS=1`.
3. Push to GitHub and redeploy. No new packages or database migration required.
4. Verify login, registration, Google login and messaging. Confirm the old
   `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR`, `ERR_ERL_UNDEFINED_IP_ADDRESS`,
   `ERR_INVALID_ARG_TYPE`, and Better Auth shared bucket warning disappear.
5. Ensure the resolved client IP corresponds to the browser, not the Render
   gateway. Do NOT configure `trust proxy = true` globally or trust arbitrary
   headers. If the network has more than one trusted hop, investigate its exact
   topology before adjusting `TRUST_PROXY_HOPS`.

No client designs or storage features were changed.
