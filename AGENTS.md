# qr-saas — agent hub

## Stack
Next.js 16 (App Router) · React 19 · Prisma 6 · Tailwind 4 · Zod · TypeScript

## Rules
Domain Prefer/Never живут в `.cursor/rules/*.mdc` — не дублировать здесь.

| Rule | Scope |
|------|--------|
| `qr-saas-core.mdc` | alwaysApply — стек, MSG, секреты |
| `next-app-router.mdc` | `src/app/**`, middleware |
| `api-routes.mdc` | API + client-api |
| `prisma-data.mdc` | prisma + db |
| `auth-security.mdc` | auth, CSRF, keys |
| `ui-design-system.mdc` | UI / DS / theme |
| `payments-integrations.mdc` | YooKassa, S3, queue |
| `qr-domain.mdc` | QR types / encode / routes |

## Gold
- @src/lib/user-messages.ts — MSG RU
- @src/lib/env.ts — secrets / config
- @src/lib/api-response.ts + @src/lib/client-api.ts — API shape + CSRF
- @src/lib/auth.ts + @src/middleware.ts — session + CSRF_SKIP
- @src/lib/db.ts + @prisma/schema.prisma — data access
- @src/styles/design-system/ — fk-* tokens
- @src/lib/qr-types.ts + @src/lib/qr-content.ts — QR domain
- @src/lib/yookassa.ts + @src/lib/s3.ts — payments / storage
- @src/lib/product-analytics.ts — Metrika funnel goals
- @docs/PRODUCT-READINESS-PLAN.md — post-UI product waves + Metrika checklist

## Scripts
`npm run dev` · `npm run prisma:generate` · `npm run prisma:push` · `npm run build` · `npm run lint`

## Git baseline
- Новые задачи начинать после `git fetch origin` от актуальной `origin/main`; перед запуском старого PR сравнивать его merge-base с production-веткой и последним отчётом выпуска.
- `main` — единая база разработки. В неё перенесён выпущенный код PR #6–10 от 26–27.10.2026, включая production-коммит `a8ee40a1c7d3fd1ddab50c48c05bb7b34feaf8cc` из `qr-robokassa-integration`; история коммитов сохранена.
- Новые изменения — отдельной веткой от актуальной `origin/main` и PR к `main`. Старые PR перед слиянием обновлять из `main`, проверять конфликты и запускать CI на итоговом коде.
- `qr-robokassa-integration` сохраняется как ветка прежней production-конфигурации; новые функциональные PR в неё не направлять. Срочное исправление, выпущенное отдельно, обязательно переносить обратно в `main`.
- Обновление `main` не является разрешением на deployment. Production-коммит и миграции выпускаются отдельно по `DEPLOY.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
