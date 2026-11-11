# AEVORA production image: same-origin React, Express, Socket.IO, FFmpeg.
# This runs on AMD64 and Oracle Always Free's ARM64 A1 instances.
FROM node:22-bookworm-slim AS client-build
WORKDIR /workspace/client
COPY client/package*.json ./
RUN npm ci --no-audit --no-fund
COPY client/ ./
# Public GIPHY browser key only. Never pass secret API keys as build args.
ARG VITE_GIPHY_API_KEY=""
ENV VITE_GIPHY_API_KEY=${VITE_GIPHY_API_KEY}
RUN npm run build

FROM node:22-bookworm-slim AS backend
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

FROM node:22-bookworm-slim
ENV NODE_ENV=production PORT=10000
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends ca-certificates ffmpeg clamdscan \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=backend /app/server/node_modules ./server/node_modules
COPY server/ ./server/
COPY deploy/ ./server/deploy/
COPY --from=client-build /workspace/client/dist ./client/dist
RUN mkdir -p /app/server/storage \
 && chown -R node:node /app/server/storage \
 && chmod +x /app/server/deploy/clamdscan-remote.sh
USER node
WORKDIR /app/server
EXPOSE 10000
CMD ["node", "src/server.js"]
