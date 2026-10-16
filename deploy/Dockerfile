FROM node:24-bookworm-slim AS builder

WORKDIR /app

# Copy workspace manifests first so dependency installation is cached between code changes.
COPY package.json package-lock.json ./
COPY apps/bot/package.json ./apps/bot/package.json
COPY apps/bot/.env.example ./apps/bot/.env.example
COPY packages/flag-domain/package.json ./packages/flag-domain/package.json

RUN npm ci

COPY . .

RUN npm run build && npm run bot:build

FROM nginx:alpine AS miniapp

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/miniapp/browser /usr/share/nginx/html

EXPOSE 80

FROM node:24-alpine AS web

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

COPY --from=builder /app/dist/web ./dist/web

EXPOSE 4000

CMD ["node", "dist/web/server/server.mjs"]

FROM node:24-alpine AS bot-dependencies

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/bot/package.json ./apps/bot/package.json
COPY packages/flag-domain/package.json ./packages/flag-domain/package.json

RUN npm ci --omit=dev --ignore-scripts --include-workspace-root=false \
  --workspace=flag-connect-bot \
  --workspace=@flag-connect/flag-domain

FROM bot-dependencies AS bot

ENV NODE_ENV=production

COPY --from=builder /app/apps/bot/dist ./apps/bot/dist
COPY --from=builder /app/packages/flag-domain/dist ./packages/flag-domain/dist

CMD ["node", "apps/bot/dist/index.js"]
