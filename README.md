# QR SaaS

Web-first QR SaaS (QR-S.ru):
- регистрация / login, workspaces и роли
- статические и динамические QR
- скачивание PNG/SVG (+ JPG/EPS/PDF по тарифу)
- редирект `/r/{shortCode}` с редактируемым URL
- аналитика сканов, bulk CSV, API, биллинг YooKassa / Robokassa

Robokassa подключается через `BILLING_PROVIDER=robokassa`; по умолчанию новые оплаты идут через ЮKassa. Настройки, адреса уведомлений и проверка запуска: [ROBOKASSA-INTEGRATION-2026-10-08.md](docs/ROBOKASSA-INTEGRATION-2026-10-08.md).
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

Локальный пользователь (только dev, не production):

- логин: `user@local.ru`
- пароль: `eRwoxcWdVNW0XYzc`

Вход: `/login`.

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
| [`docs/PRODUCT-READINESS-RELEASE-2026-10-08.md`](docs/PRODUCT-READINESS-RELEASE-2026-10-08.md) | Фактический выпуск, приёмка, сохранность данных и открытые внешние зависимости |
| [`docs/VISUAL-ROLLOUT-PLAN.md`](docs/VISUAL-ROLLOUT-PLAN.md) | Visual / DS rollout (этапы 0–8 закрыты) |
| [`docs/PRD.md`](docs/PRD.md) | Scope / JTBD (исторический MVP-черновик) |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Архитектурные решения |
| [`docs/BLOG_API.md`](docs/BLOG_API.md) | Blog API |
| [`AGENTS.md`](AGENTS.md) | Хаб для Cursor-агентов + gold-файлы |

## Не забыть (ops / продукт)

### 1. Яндекс Метрика — клиентские цели

Код шлёт `reachGoal` из `src/lib/product-analytics.ts` **только после cookie consent**.  
ID счётчика — в админке Site Settings.

Продуктовая воронка считается **на сервере** (`FunnelEvent`, отчёт `/admin/funnel`):
активация независимой статики = сохранение + корректное скачивание того же QR;
активация управляемого QR дополнительно требует первого внешнего открытия того же кода;
оплата = `payment_succeeded` после подтверждённого `SUCCEEDED` платёжного провайдера. В production используется Robokassa.
Клиентский `subscription_paid` **нельзя** считать оплатой и код его больше не шлёт.

В кабинете Метрики цели с теми же идентификаторами — вспомогательные, не источник правды:

- `registration_completed`
- `qr_type_selected`
- `qr_created`
- `dynamic_qr_created`
- `qr_downloaded`
- `static_qr_downloaded`
- `qr_preview_downloaded`
- `pricing_viewed`
- `checkout_started`
- `member_invited`
- `api_key_created`

Для клиентских событий нужны согласие и готовый счётчик. Без созданных целей их не видно в отчётах. Серверный worker доставки оплаты опубликован, но без `METRIKA_OAUTH_TOKEN` выключен; реальная принятая конверсия пока не подтверждена.

### 2. Лимиты тарифов

Проверка квоты — `assertCanCreateQrCodes` в `src/lib/plans.ts` (create + bulk).  
Публичная независимая статика восьми типов, включая прямой vCard: бесплатно без регистрации и лимита локальных генераций. Необязательный облачный архив использует прежние квоты FREE. Динамика, hosted и bulk — на Про+. CSV до 50 строк за запрос с атомарной квотой и безопасным повтором.

### 3. Приоритет разработки

Технический основной путь опубликован 8 октября — см. [`docs/PRODUCT-READINESS-PLAN.md`](docs/PRODUCT-READINESS-PLAN.md).
Открыты SMTP/реальная доставка писем, OAuth/цели/реальная конверсия Метрики, интервью и пилоты. Остаток уведомлений зависимостей инструментов сборки перечислен в отчёте выпуска.
Следующие функции (роли, большие партии, печатные форматы, интеграции) выбираются по подтверждённому спросу.

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
