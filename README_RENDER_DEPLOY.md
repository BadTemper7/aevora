# AEVORA | Render Free deployment package

This is the streamlined Render deployment archive. It contains the application source, the Docker build, the Render configuration, runtime media scanning helper, and safe environment examples.

## Deploy

1. Create a **private** GitHub repository and push the contents of this `aevora/` directory.
2. In Render, create a **Web Service**, select Docker, the `main` branch, and `./Dockerfile` in the repository root. Choose the Free instance plan.
3. Configure Render environment variables using `server/.env.example` as a reference. At minimum provide `MONGODB_URI`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CLIENT_URL`, and ImageKit credentials. Add Google/LiveKit credentials when enabling those services. Use your actual `https://<service>.onrender.com` address for both auth URLs.
4. In Google Cloud OAuth, authorize `https://<service>.onrender.com/api/auth/callback/google` as the callback URL.
5. Allow the Render outbound IP ranges in MongoDB Atlas Network Access. Deploy and test `/api/health`.

**Important:** Render Free may sleep when idle. Production media uploads are designed to fail closed when an antivirus scanning service is unavailable. The free preview is not a full production media-processing deployment.

## Cleanup scope

Removed from this deployment-only archive: legacy R2 and Oracle deployment docs/configuration, obsolete test reports, source regression tests, maintenance/migration scripts, and a nested UI ZIP. The application source and required ImageKit storage modules remain unchanged.

Do not commit actual `.env` secrets. Edit them in Render's Environment settings instead.
