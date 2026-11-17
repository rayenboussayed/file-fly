# syntax=docker/dockerfile:1
# Multi-stage build: install deps + build with dev tooling, then prune to a
# production-only runtime. The media pipeline (ffmpeg via node-av, sharp)
# ships prebuilt glibc binaries, so Debian slim is enough.

FROM node:24-bookworm-slim AS build
WORKDIR /app

# .npmrc carries legacy-peer-deps=true (peer resolution parity with the host).
# --ignore-scripts: the repo's `prepare` calls husky, which is not a dependency;
# it is useless and fatal inside a container.
COPY package.json package-lock.json .npmrc ./
COPY packages/backend/package.json packages/backend/package.json
RUN npm ci --ignore-scripts

COPY packages/backend ./packages/backend
RUN npm run build -w file-fly-backend && npm prune --omit=dev

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/packages/backend/package.json ./packages/backend/package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/backend/dist ./packages/backend/dist

# Cache root is a volume: media output cache + tesseract language data.
RUN mkdir -p /data/cache && chown -R node:node /data /app
ENV CACHE_DIR=/data/cache
USER node

EXPOSE 3000
CMD ["node", "packages/backend/dist/main"]
