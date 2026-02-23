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

---

## Бэкапы (рекомендуется)

Настройте регулярные бэкапы PostgreSQL:

```bash
docker compose exec postgres pg_dump -U postgres qr_saas > backup_$(date +%Y%m%d).sql
```

Или используйте Coolify Backup, если доступно.
