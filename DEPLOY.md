# Развёртывание на Coolify

## Сохранение данных при обновлениях

Используются **именованные тома** `postgres_data` и `redis_data`. При пересборке и обновлении приложения:
- данные PostgreSQL сохраняются;
- данные Redis сохраняются (очереди BullMQ).

**Не выполняйте** `docker compose down -v` — флаг `-v` удаляет тома и все данные.

---

## Шаг 1: Подготовка репозитория

Убедитесь, что в репозитории есть:
- `Dockerfile`
- `docker-compose.yml`
- `.env.example`

---

## Шаг 2: Создание ресурса в Coolify

1. **New Resource** → **Docker Compose**
2. Подключите Git-репозиторий
3. Укажите путь к compose-файлу: `docker-compose.yml` (в корне проекта `qr-saas/`)
4. **Build Pack**: Dockerfile (Coolify определит автоматически)

---

## Шаг 3: Переменные окружения

**Обязательно** настройте переменные в Coolify **до первого деплоя**. Без `POSTGRES_PASSWORD` контейнер PostgreSQL не запустится.

В Coolify → **Environment Variables** добавьте:

| Переменная | Описание | Обязательно |
|------------|----------|-------------|
| `POSTGRES_PASSWORD` | Пароль PostgreSQL | Да |
| `JWT_SECRET` | Секрет для JWT, не короче 32 случайных символов. В production приложение не стартует без него и не принимает development-default | Да |
| `APP_URL` | URL сайта, напр. `https://qr-s.ru` | Да |
| `S3_ENDPOINT` | Endpoint S3 | Да |
| `S3_REGION` | Регион S3 | Да |
| `S3_BUCKET` | Имя бакета | Да |
| `S3_ACCESS_KEY_ID` | Ключ доступа S3 | Да |
| `S3_SECRET_ACCESS_KEY` | Секретный ключ S3 | Да |
| `S3_PUBLIC_URL` | Публичный URL для файлов | Да |
| `YOOKASSA_SHOP_ID` | shop_id из личного кабинета ЮKassa | Да (для оплаты) |
| `YOOKASSA_SECRET_KEY` | Секретный ключ из личного кабинета ЮKassa | Да (для оплаты) |
| `SMTP_HOST` | SMTP-сервер для писем сброса пароля | Да, если нужен сброс пароля по почте |
| `SMTP_PORT` | Порт SMTP, обычно `465` | Нет (`465` по умолчанию в compose) |
| `SMTP_USER` | Логин SMTP | Если сервер требует авторизацию |
| `SMTP_PASS` | Пароль SMTP | Если сервер требует авторизацию |
| `SMTP_FROM` | Отправитель, например `QR-S.ru <noreply@qr-s.ru>` | Да вместе с `SMTP_HOST` |
| `SMTP_FROM` | Отправитель, например `QR-S.ru <noreply@qr-s.ru>` | Да вместе с `SMTP_HOST` |
| `TRUST_PROXY` | `1` в Docker за nginx/Coolify: лимиты считаются по внешнему IP. Proxy обязан перезаписывать `X-Forwarded-For`. Без доверенного proxy оставьте выключенным | Да в compose (`1`) |
| `ANALYTICS_RETENTION_DAYS` | Срок хранения сырых UA/IP/referer, по умолчанию 90 | Нет |

`DATABASE_URL` и `REDIS_URL` задаются в `docker-compose.yml` и не требуют ручной настройки.

> **Если PostgreSQL падает как "unhealthy"**: 1) Убедитесь, что переменные заданы в Coolify (или используется fallback `postgres`). 2) Смотрите логи контейнера `postgres`. **Не удаляйте тома** `postgres_data` / `redis_data` для диагностики — это уничтожит пользовательские QR и платежи. Если volume действительно повреждён, сначала восстановите из backup на **отдельной копии**, и только после сверки `verify-qr-health` решайте, трогать ли production.

---

## Шаг 4: Домен и SSL

1. В Coolify добавьте домен (например, `qr-s.ru`)
2. Включите **Generate SSL Certificate**
3. Обновите `APP_URL` на `https://qr-s.ru`

---

## Шаг 5: Первый деплой

1. Запустите деплой
2. Сервис `init-db` выполняет `node scripts/migrate-deploy.mjs`:
   - на **пустой** базе — обычный `prisma migrate deploy`;
   - на **непустой db-push базе без истории миграций** (Prisma `P3005`) — сверяет схему. При точном совпадении с `prisma/legacy-schema.prisma` (снимок коммита `c9d3249`) выполняет добавочные SQL-миграции одной транзакцией, затем проверяет конечную схему и записывает историю. Уже совпадающую с конечной схемой базу принимает как ранее обновлённую. Другая схема останавливает переход. Не используйте generic resolve после любой ошибки.
3. Создайте администратора (через Coolify **Execute Command** или SSH):

```bash
# 1. Зарегистрируйтесь на сайте через /register
# 2. Выдайте права админа:
docker compose exec app node scripts/set-admin.mjs your@email.com
```

---

## Обновление (релизы)

1. До push/redeploy выполнить проверки из [QR-COMPATIBILITY.md](docs/QR-COMPATIBILITY.md), сохранить backup и baseline. При автодеплое push уже запускает релиз.
2. Coolify пересоберёт образ, `init-db` применит миграции; база может измениться.
3. Сохранить существующий Coolify resource / Compose project и привязку к тем же томам: другое имя проекта может подключить пустой том.
4. После запуска проверить старые QR и сравнить baseline; наличие тома само по себе не гарантирует совместимость.

Подробный чеклист — в разделе [Pre-deploy checklist (Coolify)](#pre-deploy-checklist-coolify).

---

## Pre-deploy checklist (Coolify)

Выполняйте **на сервере** (Coolify → **Terminal** / SSH), в каталоге с `docker-compose.yml`.

### За 15–30 минут до деплоя

- [ ] **`JWT_SECRET` задан, не короче 32 случайных символов** — без этого приложение в production не стартует
- [ ] **Убедиться, что `APP_URL` не меняется** (например `https://qr-s.ru`) — иначе сломаются напечатанные динамические QR с `/r/код`
- [ ] **Не трогать тома** — не запускать `docker compose down -v`
- [ ] **Бэкап PostgreSQL:**

```bash
docker compose exec -T postgres pg_dump -U postgres qr_saas > backup_$(date +%Y%m%d_%H%M).sql
ls -lh backup_*.sql
```

- [ ] **Снимок QR-данных** (для сравнения после деплоя):

```bash
docker compose exec -T app node scripts/verify-qr-health.mjs --snapshot > qr-baseline_$(date +%Y%m%d_%H%M).json
```

- [ ] **Быстрый отчёт** (опционально, человекочитаемый):

```bash
docker compose exec app node scripts/verify-qr-health.mjs
```

Сохраните файлы `backup_*.sql` и `qr-baseline_*.json` **на хосте** (не только в контейнере).

### Во время деплоя в Coolify

- [ ] Деплой через обычный **Redeploy** / push в Git
- [ ] Дождаться успешного `init-db` (`prisma migrate deploy`) — при ошибке миграции деплой **остановится**. Не запускайте `prisma db push --accept-data-loss` на production
- [ ] Проверить, что контейнер `app` в статусе **running** и healthcheck `/api/health` отвечает 200

### Сразу после деплоя (5–10 минут)

- [ ] **Сравнение QR с baseline:**

```bash
cat qr-baseline_YYYYMMDD_HHMM.json | docker compose exec -T app node scripts/verify-qr-health.mjs --compare -
echo "exit code: $?"
```

Код выхода `0` — регрессии нет. Код `1` — что-то пропало, **не закрывайте инцидент**, смотрите rollback.

- [ ] **Сверка оплат** (если webhook мог потеряться):

```bash
docker compose exec app npm run billing:reconcile
```

Повторы не удваивают период: один и тот же платёж применяется один раз; два разных платежа сериализуются по workspace. Ложную отмену webhook перекрывает статус GET у YooKassa. Для одного платежа: `npm run billing:reconcile -- <payment_id>`.

- [ ] **Smoke test в браузере:**
  - `/login` — вход
  - `/admin/qr` — список QR на месте
  - один **динамический** QR: `https://qr-s.ru/r/<код>` (редирект работает)
  - один **хостed** QR при наличии: `/p/<код>`
- [ ] **Статические ссылки** (тип «Ссылка», код «—») — это норма; они не используют `/r/`, URL зашит в сам QR

### Если что-то пошло не так (rollback)

1. В Coolify откатить на **предыдущий образ** / git tag
2. Восстановить БД **только на остановленной копии**, не поверх живых writers:

```bash
# 1) Остановить приложение, чтобы не было записей во время restore
docker compose stop app analytics-purge init-db

# 2) Создать пустую копию (не production volume) и загрузить dump туда
docker compose exec postgres createdb -U postgres qr_saas_restore || true
cat backup_YYYYMMDD_HHMM.sql | docker compose exec -T postgres psql -U postgres -d qr_saas_restore -v ON_ERROR_STOP=1

# 3) Сверить QR/платежи на копии, затем уже решать про production
DATABASE_URL=postgresql://postgres:...@postgres:5432/qr_saas_restore npm run verify:qr
```

Прямая заливка dump в живую `qr_saas` без `ON_ERROR_STOP` и без остановки writers **запрещена**: это не обратимый restore.

3. Повторить `verify-qr-health.mjs --compare` после отката

### Запрещено на production без отдельного согласования

| Команда | Почему |
|---------|--------|
| `docker compose down -v` | Удаляет `postgres_data` |
| `prisma migrate reset` | Полный сброс БД |
| `prisma db push --accept-data-loss` | Может удалить колонки/строки |
| `DROP TABLE` / `TRUNCATE` | Потеря данных |

---

## Проверка QR (`verify-qr-health.mjs`)

Скрипт читает БД через Prisma и **ничего не меняет**.

| Режим | Команда |
|-------|---------|
| Отчёт | `docker compose exec app node scripts/verify-qr-health.mjs` |
| JSON | `docker compose exec -T app node scripts/verify-qr-health.mjs --json` |
| Снимок | `docker compose exec -T app node scripts/verify-qr-health.mjs --snapshot > qr-baseline.json` |
| Сравнение | `cat qr-baseline.json \| docker compose exec -T app node scripts/verify-qr-health.mjs --compare -` |

Локально (с `DATABASE_URL` на prod/staging):

```bash
npm run verify:qr
```

Снимки версии 2 сравнивают полный отпечаток содержимого и настроек доступа, shortCode, тип, владельца, архивный статус и APP_URL. Любое изменение даёт ненулевой код выхода; новые QR допустимы. Старый снимок без отпечатков не подтверждает совместимость: новый baseline нужно получить **до релиза**. Если на сервере старый скрипт, скопируйте туда обновлённые `scripts/verify-qr-health.mjs` и `scripts/qr-health-contract.mjs` в один каталог с доступом к существующему Prisma client и окружению старого приложения, затем снимите baseline. Само приложение для этого обновлять не нужно.

Изменения владельцем во время проверки тоже будут отмечены: разберите их поштучно, не перезаписывайте baseline вслепую. Снимок содержит метаданные пользователей и URL; храните его с ограниченным доступом вне Git. Проверка БД не проверяет DNS, HTTPS, доступность S3 или обработчики HTTP — необходимы проверки старых ссылок из чеклиста.

**Коды выхода:** `0` — ок; `1` — регрессия при `--compare`; `2` — ошибка или критические флаги у QR.

**Нормально:** статические ссылки без `shortCode` (в админке «Код: —»).  
**Проблема:** динамический QR без `shortCode` или без URL назначения.

---

## Бэкапы (рекомендуется)

Настройте регулярные бэкапы PostgreSQL:

```bash
docker compose exec -T postgres pg_dump -U postgres qr_saas > backup_$(date +%Y%m%d).sql
```

Или используйте Coolify Backup, если доступно.

## Уведомления администратора

Новая миграция `20260919130000_admin_notifications` добавляет журнал бизнес-событий, очередь, настройки, heartbeat и `Payment.paidAt`, а также совместимое создание журнала административных изменений. Выполните штатный `prisma migrate deploy` через init-db перед запуском новой версии.

Задайте одинаковый `ADMIN_INTEGRATIONS_KEY` в приложении и `notification-worker`: 32 случайных байта в base64 (например, `openssl rand -base64 32`). Сохраните ключ в защищённом хранилище вместе с резервной копией БД. Не меняйте его без повторного ввода токена: старый шифротекст перестанет читаться. Ключ не должен попадать в репозиторий. `APP_URL` должен быть доступным адресом сайта, чтобы ссылки из Telegram открывались с телефона.

Docker Compose содержит сервис `notification-worker` с автоматическим перезапуском. Запустите его вместе с приложением. Для локальной разработки: `node --env-file=.env --experimental-strip-types --import ./scripts/register-src-alias.mjs scripts/notification-worker.ts`. Для окружения с уже установленными переменными: `npm run notifications:worker`. В production запускайте один экземпляр worker под supervisor/Compose; блокировки очереди защищают задачи, но ограничение скорости рассчитано на один экземпляр.

Откройте `/admin/notifications`: создайте отдельного бота через BotFather, напишите ему `/start` либо добавьте в закрытую группу с правом отправки. Введите токен и числовой ID чата, сохраните, отправьте тест. Проверьте статус «Отправлено» в журнале и сообщение в выбранном чате; затем включите события и сохраните. Токен существующего бота авторизации менять не нужно. До настройки ничего не отправляется. Каждое сохранение отменяет ранее ожидающие сообщения, чтобы они не ушли старому получателю. Тест доступен при выключенных событиях.

«Обработчик работает» означает heartbeat за последние 60 секунд. Потеря ответа Telegram может привести к редкому дублю; «Отправлено» означает принятие API, не прочтение. При окончательной ошибке доступны журнал и повтор. Тестовые бизнес-события исключены из уведомлений и сводки. Настройки и отправки доступны только администраторам.
