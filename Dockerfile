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
COPY packages/dashboard/package.json packages/dashboard/package.json
RUN npm ci --ignore-scripts

COPY packages/backend ./packages/backend
RUN npm run build -w file-fly-backend && npm prune --omit=dev

FROM node:24-bookworm-slim AS dashboard-build
WORKDIR /app

COPY package.json package-lock.json .npmrc ./
COPY packages/backend/package.json packages/backend/package.json
COPY packages/dashboard/package.json packages/dashboard/package.json
RUN npm ci --ignore-scripts

COPY packages/dashboard ./packages/dashboard
RUN npm run build -w file-fly-dashboard

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/package.json ./
COPY --from=build /app/packages/backend/package.json ./packages/backend/package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/backend/dist ./packages/backend/dist
COPY --from=dashboard-build /app/packages/dashboard/dist ./dashboard

# Cache and metrics roots are volumes: media cache + tesseract data, and the
# metrics sqlite file (never inside the cache dir; the janitor sweeps it).
RUN mkdir -p /data/cache /data/metrics && chown -R node:node /data /app
ENV CACHE_DIR=/data/cache
ENV METRICS_DIR=/data/metrics
ENV DASHBOARD_DIR=/app/dashboard
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT ?? 3000) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "packages/backend/dist/main"]
