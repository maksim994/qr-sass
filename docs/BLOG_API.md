# API блога qr-s.ru

Актуальная документация редакционного API: [ARTICLE-API.md](ARTICLE-API.md).
Полная OpenAPI-схема: [openapi.yaml](../openapi.yaml), публично — `/api/v1/openapi.json`.

- Создание, чтение, правки и предпросмотр: `/api/v1/articles`, редакционный Bearer-ключ из `/admin/blog/tokens`, 60 запросов в минуту.
- Публикация сохранённой статьи: `POST /api/v1/articles/{id}/publish`, отдельный Bearer-ключ из **QRS_ARTICLES_PUBLISH_TOKEN**, тело `{"version": N}`. Пустая переменная или прежний ключ — 403; устаревшая версия — 409. До 10 успешных публикаций за скользящий час на весь API.
- FAQ поддерживает ссылки, жирный и курсив; JSON-LD содержит чистый текст. Предпросмотр и сайт используют один рендерер.
- `/api/admin/blog` обслуживает интерфейс администратора с cookie-сессией и CSRF. Workspace-ключи `qre_` для него не подходят.

Миграции БД для нового метода публикации не нужны. Значение нового ключа задаёт Максим в окружении production; в репозитории находится только имя переменной и пустой пример. Снятие с публикации и расписание остаются в админке.

HTTP-проверка на отдельной синтетической БД: `scripts/verify-article-publication.mjs`.
Нужны `ARTICLE_PUBLISH_ISOLATED_TEST=1`, локальная `DATABASE_URL` с базой `qr_api_publish_test`,
`ARTICLE_PUBLISH_TEST_ORIGIN` (по умолчанию `http://localhost:3126`) и одинаковый случайный
`QRS_ARTICLES_PUBLISH_TOKEN` в окружении теста и Next-сервера. Скрипт не допускает production-адреса.
В CI проверка использует существующие Next/PostgreSQL из job `abuse-http`, без новой job.
