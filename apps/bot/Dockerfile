# صورة خدمة البوت (لـ Koyeb أو أي منصة Docker). البناء من جذر المستودع:
#   docker build -f apps/bot/Dockerfile -t qfx-bot .
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/bot/package.json apps/bot/
COPY apps/web/package.json apps/web/
RUN npm ci --include=dev -w @qfx/bot -w @qfx/shared --include-workspace-root
COPY packages/shared packages/shared
COPY apps/bot apps/bot
RUN npm run build -w @qfx/bot

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/bot/package.json apps/bot/
COPY apps/web/package.json apps/web/
RUN npm ci --omit=dev -w @qfx/bot && npm cache clean --force
COPY --from=build /app/apps/bot/dist apps/bot/dist
USER node
EXPOSE 8080
CMD ["node", "apps/bot/dist/index.js"]
