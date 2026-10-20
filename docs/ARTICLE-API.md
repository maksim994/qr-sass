# API статей v1

База: `https://qr-s.ru`. Ключ создаёт администратор в `/admin/blog/tokens`: имя, однократная выдача, последнее использование, отзыв. В базе — только salted SHA-256, сырой ключ восстановить нельзя. Передавайте его боту через защищённое поле секретов. Не отправляйте в чат/письма, не включайте в Git, URL, логи или скриншоты. Отзыв действует сразу; для замены создайте новый ключ и отзовите старый.

Каждый запрос требует `Authorization: Bearer <key>`. Сессия администратора и `qre_` QR-ключи не подходят. Лимит — 60 запросов в минуту на ключ, общий для всех процессов, включая ошибочные запросы после успешной аутентификации. 429 содержит `Retry-After` в секундах. Отсутствующий, неверный или отозванный ключ — 401.

Ответы: `{ "ok": true, "data": ... }` либо `{ "ok": false, "error": "Русское сообщение", "code": "..." }`. Данные не кешируются (`private, no-store`). Публичная схема без данных: `/api/v1/openapi.json`; полная OpenAPI 3.1 в `openapi.yaml`. Перегенерация: `node scripts/generate-blog-openapi.mjs`.

## Примеры curl

Примеры для Bash. Сначала введите ключ без отображения и без записи значения в историю. Временный curl-конфиг с правами 600 не показывает ключ в аргументах процесса; удалите его после работы. Не включайте `set -x`, `curl -v` или трассировку.

```bash
umask 077
read -rs -p 'API-ключ: ' ARTICLE_API_KEY; printf '\n'
ARTICLE_CURL_CONFIG=$(mktemp)
printf 'header = "Authorization: Bearer %s"\n' "$ARTICLE_API_KEY" > "$ARTICLE_CURL_CONFIG"
unset ARTICLE_API_KEY
trap 'rm -f "$ARTICLE_CURL_CONFIG"' EXIT
BASE=https://qr-s.ru
```

Список: `status=draft|scheduled|published`, точный `slug`, `page` от 1, `limit` 1–100 (по умолчанию 50). Возвращает `items`, `total`, `page`, `limit`. Каждый элемент содержит `id`, `format`, `version` и основные метаданные.

```bash
curl --fail-with-body -sS --config "$ARTICLE_CURL_CONFIG" \
  "$BASE/api/v1/articles?status=draft&limit=50&page=1"
```

Чтение: все поля статьи, включая исходный `content`, `format`, `faq`, `legacyHtml`, `structuredData` (JSON-строка либо null), даты, счётчики и `version`. У старой статьи без истории версия 0.

```bash
ARTICLE_ID='id-из-списка'
curl --fail-with-body -sS --config "$ARTICLE_CURL_CONFIG" \
  "$BASE/api/v1/articles/$ARTICLE_ID"
```

Создание: обязательны `title`, `slug`, `content`. По умолчанию Markdown. Результат **всегда draft**, даже с `status: "published"` или `"scheduled"` (поле игнорируется). Остальные поля публикации не принимаются. Ответ 201, версия 1.

```bash
curl --fail-with-body -sS --config "$ARTICLE_CURL_CONFIG" \
  -H 'Content-Type: application/json' --data-binary @- "$BASE/api/v1/articles" <<'JSON'
{"title":"Новая статья","slug":"new-article","format":"markdown","content":"## Раздел\n\nТекст статьи.\n\n![Описание изображения](https://example.org/image.webp)","metaTitle":"SEO-заголовок","metaDescription":"Описание страницы","excerpt":"Анонс","faq":[{"question":"Вопрос?","answer":"Ответ."}],"comment":"Первый черновик"}
JSON
```

Правка: сначала GET, затем PATCH с полученной `version`. При 409 перечитайте статью, объедините изменения и повторите с актуальным номером; не делайте слепой повтор. Каждое сохранение, включая no-op, создаёт версию с автором `API: <имя ключа>`. No-op и пробельные изменения не меняют редакционную дату; `minorEdit: true` сохраняет её и при содержательных изменениях.

```bash
curl --fail-with-body -sS --config "$ARTICLE_CURL_CONFIG" -X PATCH \
  -H 'Content-Type: application/json' --data-binary @- "$BASE/api/v1/articles/$ARTICLE_ID" <<'JSON'
{"version":1,"content":"## Обновлённый раздел\n\nНовый текст.","metaTitle":"Новый SEO-заголовок","metaDescription":"Новое описание","coverImageUrl":"https://example.org/cover.webp","coverImageAlt":"Описание обложки","structuredData":{"@context":"https://schema.org","@type":"HowTo","name":"Инструкция"},"comment":"Уточнена инструкция"}
JSON
```

Meta Title — до 500 символов, Meta Description — до 2000, excerpt — до 10000, content — до 1000000 (всё тело запроса ≤1 MiB). FAQ — до 100 пунктов, вопрос до 500 и ответ до 10000 символов. JSON-LD принимает объект или строку, проверяется JSON.parse; невалидный JSON/неизвестные поля — 400. Изображения в тексте задаются Markdown `![alt](https://…)` или допустимым HTML; всё проходит действующий санитайзер. Обложка — `coverImageUrl` HTTP(S) и `coverImageAlt` до 1000 символов; null alt использует заголовок. Загрузка файлов через API не входит в этап 3.

Старый HTML остаётся только для чтения. Чтобы изменить тело, получите его через GET, подготовьте Markdown и передайте `format: "markdown", confirmConversion: true`. Исходный HTML сохранится в `legacyHtml` и версии №0. Массовой/автоматической конвертации нет. Вернуться к HTML можно штатным откатом в админке.

Запрещены (403): изменение slug после первой публикации и любые поля `status`, `published`, `publishedAt`, `scheduledAt`, `firstPublishedAt` в PATCH. Опубликованный текст обновляется сразу, но право публикации/снятия/расписания остаётся в админке. DELETE/PUT и методы работы с версиями/журналом отсутствуют (405/404). Редиректы — отдельный этап 4.

Публичная схема:

```bash
curl --fail-with-body -sS "$BASE/api/v1/openapi.json"
```
