# QR SaaS

Web-first QR SaaS (QR-S.ru):
- регистрация / login, workspaces и роли
- статические и динамические QR
- скачивание PNG/SVG (+ JPG/EPS/PDF по тарифу)
- редирект `/r/{shortCode}` с редактируемым URL
- аналитика сканов, bulk CSV, API, биллинг YooKassa
- стиль-студия с проверкой scannability
- SEO-лендинги по отраслям, блог, Telegram Mini App

## Quick start

1. Copy environment file:

```bash
cp .env.example .env
```

2. Start PostgreSQL and update `DATABASE_URL` in `.env`.

3. Push Prisma schema and generate client:

```bash
npm run prisma:generate
npm run prisma:push
```

4. Run development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Important routes

- `/` — маркетинг
- `/register`, `/login` — auth (Яндекс OAuth опционально)
- `/dashboard` — кабинет (обзор, create, library, analytics, billing, team, API)
- `/r/{shortCode}` — динамический редирект (критичный путь)
- `/p/{code}`, `/v/{code}`, `/g/{slug}` — hosted / vCard / GDPR gate
- `/mini` — Telegram Mini App
- SEO-сегменты: `/dynamic-qr`, `/qr-menu`, `/qr-for-packaging`, `/qr-for-agencies`, `/qr-for-events`, `/bulk-qr-generator`, `/qr-code-analytics`  
  (контент: `src/lib/seo-content.ts`)

## Documentation

| Документ | Зачем |
|----------|--------|
| [`docs/PRODUCT-READINESS-PLAN.md`](docs/PRODUCT-READINESS-PLAN.md) | **Актуальный продукт-план** после UI-rollout: волны A/B/C, цели Метрики, чеклист деплоя |
| [`docs/VISUAL-ROLLOUT-PLAN.md`](docs/VISUAL-ROLLOUT-PLAN.md) | Visual / DS rollout (этапы 0–8 закрыты) |
| [`docs/PRD.md`](docs/PRD.md) | Scope / JTBD (исторический MVP-черновик) |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Архитектурные решения |
| [`docs/BLOG_API.md`](docs/BLOG_API.md) | Blog API |
| [`AGENTS.md`](AGENTS.md) | Хаб для Cursor-агентов + gold-файлы |

## Не забыть (ops / продукт)

### 1. Яндекс Метрика — цели воронки

Код шлёт `reachGoal` из `src/lib/product-analytics.ts` **только после cookie consent**.  
ID счётчика — в админке Site Settings.

В кабинете Метрики нужно **вручную создать цели** с теми же идентификаторами:

- `registration_completed`
- `qr_type_selected`
- `qr_created`
- `dynamic_qr_created`
- `qr_downloaded`
- `pricing_viewed`
- `checkout_started`
- `subscription_paid`
- `member_invited`
- `api_key_created`

Без созданных целей события уходят, но в отчётах «Цели» их не видно.

### 2. Лимиты тарифов

Проверка квоты — `assertCanCreateQrCodes` в `src/lib/plans.ts` (create + bulk).  
FREE: только статика, лимит QR; динамика / hosted / VCARD / bulk — на Про+.

### 3. Приоритет разработки

Волны A+B закрыты в коде — см. [`docs/PRODUCT-READINESS-PLAN.md`](docs/PRODUCT-READINESS-PLAN.md).  
Сейчас **не** добавляем новые типы QR и white-label.  
Дальше по спросу — волна C (папки/теги, audit log, email-уведомления, Redis-кэш `/r`).

### 4. Production safety

Перед миграциями — бэкап Postgres; на проде предпочитать `prisma migrate deploy`, не destructive `db push`.  
Детали: секция Data Safety в `docs/VISUAL-ROLLOUT-PLAN.md`.

## API overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/qr?workspaceId=...`
- `POST /api/qr`
- `PATCH /api/qr/{id}/target`
- `GET /api/qr/{id}/download?format=png|svg`
- `POST /api/qr/bulk`
- `POST /api/telegram/auth`
