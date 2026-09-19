FROM node:22-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: postinstall копирует CKEditor CSS, но scripts/ ещё не скопирован
RUN npm ci --ignore-scripts

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Больше памяти для Next.js build (часто падает в Docker из‑за лимитов)
ENV NODE_OPTIONS="--max-old-space-size=4096"
# Фиктивные env для build (страницы с БД помечены dynamic). JWT ≥32 символов: next build идёт с NODE_ENV=production.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
ENV JWT_SECRET="build-time-jwt-secret-do-not-use-in-runtime"
ENV APP_URL="http://localhost:3000"
ENV REDIS_URL="redis://localhost:6379"
RUN node scripts/copy-ckeditor-css.mjs
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
# Node workers import env.ts directly; Next bundles zod into web chunks only.
COPY --from=builder /app/node_modules/zod ./node_modules/zod

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Startup: migrate runs in init-db; this container only serves the app.
CMD ["node", "server.js"]
