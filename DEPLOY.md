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
| `JWT_SECRET` | Секрет для JWT (32+ символов) | Да |
| `APP_URL` | URL сайта, напр. `https://qr-s.ru` | Да |
| `S3_ENDPOINT` | Endpoint S3 | Да |
| `S3_REGION` | Регион S3 | Да |
| `S3_BUCKET` | Имя бакета | Да |
| `S3_ACCESS_KEY_ID` | Ключ доступа S3 | Да |
| `S3_SECRET_ACCESS_KEY` | Секретный ключ S3 | Да |
| `S3_PUBLIC_URL` | Публичный URL для файлов | Да |
| `YOOKASSA_SHOP_ID` | shop_id из личного кабинета ЮKassa | Да (для оплаты) |
| `YOOKASSA_SECRET_KEY` | Секретный ключ из личного кабинета ЮKassa | Да (для оплаты) |

`DATABASE_URL` и `REDIS_URL` задаются в `docker-compose.yml` и не требуют ручной настройки.

> **Если PostgreSQL падает как "unhealthy"**: 1) Убедитесь, что переменные заданы в Coolify (или используется fallback `postgres`). 2) При повторных ошибках удалите тома в Coolify и перезапустите — старый volume мог повредиться при предыдущих сбоях.

---

## Шаг 4: Домен и SSL

1. В Coolify добавьте домен (например, `qr-s.ru`)
2. Включите **Generate SSL Certificate**
3. Обновите `APP_URL` на `https://qr-s.ru`

---

## Шаг 5: Первый деплой

1. Запустите деплой
2. Сервис `init-db` выполнит `prisma db push` (создание/синхронизация схемы), после чего запустится `app`
3. Создайте администратора (через Coolify **Execute Command** или SSH):

```bash
# 1. Зарегистрируйтесь на сайте через /register
# 2. Выдайте права админа:
docker compose exec app node scripts/set-admin.mjs your@email.com
```

---

## Обновление (релизы)

1. Push в Git → Coolify пересоберёт образ
2. Перезапустится только сервис `app`
3. PostgreSQL и Redis остаются без изменений
4. Тома `postgres_data` и `redis_data` сохраняют данные

Подробный чеклист — в разделе [Pre-deploy checklist (Coolify)](#pre-deploy-checklist-coolify).

---

## Pre-deploy checklist (Coolify)

Выполняйте **на сервере** (Coolify → **Terminal** / SSH), в каталоге с `docker-compose.yml`.

### За 15–30 минут до деплоя

- [ ] **Убедиться, что `APP_URL` не меняется** (например `https://qr-s.ru`) — иначе сломаются напечатанные динамические QR с `/r/код`
- [ ] **Не трогать тома** — не запускать `docker compose down -v`
- [ ] **Бэкап PostgreSQL:**

```bash
docker compose exec postgres pg_dump -U postgres qr_saas > backup_$(date +%Y%m%d_%H%M).sql
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
- [ ] Дождаться успешного `init-db` (`prisma db push --accept-data-loss=false`) — при риске потери данных деплой **остановится**, это ожидаемая защита
- [ ] Проверить, что контейнер `app` в статусе **running**

### Сразу после деплоя (5–10 минут)

- [ ] **Сравнение QR с baseline:**

```bash
cat qr-baseline_YYYYMMDD_HHMM.json | docker compose exec -T app node scripts/verify-qr-health.mjs --compare -
echo "exit code: $?"
```

Код выхода `0` — регрессии нет. Код `1` — что-то пропало, **не закрывайте инцидент**, смотрите rollback.

- [ ] **Smoke test в браузере:**
  - `/login` — вход
  - `/admin/qr` — список QR на месте
  - один **динамический** QR: `https://qr-s.ru/r/<код>` (редирект работает)
  - один **хостed** QR при наличии: `/p/<код>`
- [ ] **Статические ссылки** (тип «Ссылка», код «—») — это норма; они не используют `/r/`, URL зашит в сам QR

### Если что-то пошло не так (rollback)

1. В Coolify откатить на **предыдущий образ** / git tag
2. Восстановить БД только если данные повреждены:

```bash
cat backup_YYYYMMDD_HHMM.sql | docker compose exec -T postgres psql -U postgres -d qr_saas
```

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

**Коды выхода:** `0` — ок; `1` — регрессия при `--compare`; `2` — ошибка или критические флаги у QR.

**Нормально:** статические ссылки без `shortCode` (в админке «Код: —»).  
**Проблема:** динамический QR без `shortCode` или без URL назначения.

---

## Бэкапы (рекомендуется)

Настройте регулярные бэкапы PostgreSQL:

```bash
docker compose exec postgres pg_dump -U postgres qr_saas > backup_$(date +%Y%m%d).sql
```

Или используйте Coolify Backup, если доступно.
