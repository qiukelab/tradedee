FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages packages
RUN npm ci
COPY apps apps
RUN npm run build:web
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
COPY --from=build /app /app
COPY scripts scripts
USER node
CMD ["node","apps/api/src/index.js"]

FROM caddy:2-alpine AS web
COPY --from=build /app/apps/web/dist /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile
