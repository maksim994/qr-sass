# API статей v1

База: `https://qr-s.ru`. Ключ создаёт администратор в `/admin/blog/tokens`: имя, однократная выдача, последнее использование, отзыв. В базе — только salted SHA-256, сырой ключ восстановить нельзя. Передавайте его боту через защищённое поле секретов. Не отправляйте в чат/письма, не включайте в Git, URL, логи или скриншоты. Отзыв действует сразу; для замены создайте новый ключ и отзовите старый.

Редакционные запросы требуют `Authorization: Bearer <key>`. Сессия администратора и `qre_` QR-ключи не подходят. Лимит — 60 запросов в минуту на ключ, общий для всех процессов, включая ошибочные запросы после успешной аутентификации. 429 содержит `Retry-After` в секундах. Отсутствующий, неверный или отозванный редакционный ключ — 401. Публикация использует отдельный ключ и лимит, см. следующий раздел.

## Публикация отдельным ключом

Максим задаёт **`QRS_ARTICLES_PUBLISH_TOKEN`** в окружении production. Значение хранится только в секретах окружения. Если переменная отсутствует или пустая, публикация через API выключена (403). После настройки нужен перезапуск приложения, чтобы оно прочитало env. Изменения схемы БД не требуются.

`POST /api/v1/articles/{id}/publish` принимает **только** `{"version": N}` и `Authorization: Bearer <ключ публикации>`. Текущий редакционный токен, QR-ключи, cookie, неверный или отсутствующий токен получают **403 FORBIDDEN**. Ключ публикации подходит только для этого метода; чтение и правки требуют прежнего редакционного ключа. POST/PATCH статей по-прежнему не дают редакционному ключу права публикации, снятия или расписания.

1. Получите статью и её текущую `version` через GET с редакционным ключом.
2. Проверьте текст в предпросмотре.
3. Отправьте POST publish с отдельным ключом публикации и проверенной `version`.

```http
POST /api/v1/articles/{id}/publish
Authorization: Bearer <ключ публикации из защищённого хранилища>
Content-Type: application/json

{"version": 12}
```

Ответ 200 — стандартный `data` статьи со `status: "published"`, датой и новой `version`. Метод публикует текущую сохранённую статью; отдельный `/revision` не применяется. Первая публикация получает текущую дату; повторная публикация ранее снятой статьи сохраняет первую дату по правилам админки. Опубликованная статья с актуальной version — 409. Неверная version — **409 CONFLICT**: перечитайте текст и снова проверьте его перед повтором. Отсутствующая, дробная, отрицательная или строковая version, лишние поля, невалидный JSON — 400; неизвестный id — 404.

Сохранение, проверка версии и запись истории атомарны. Создаются версия и событие `publish` с `source: "api"`, `actorName: "api"`, временем, id и ссылкой на номер версии. В комментарии — проверенная исходная version; в структурном логе — id, исходная и новая версии, время и автор. Токен не логируется. Страница, список блога и sitemap видят публикацию сразу; кеш соответствующих путей сбрасывается. IndexNow отправляется, если настроен, как при публикации из админки.

Лимит — **10 успешных публикаций за скользящий час на весь API**, общий для всех IP и процессов, сохраняется после перезапуска и ротации токена. Параллельные запросы учитываются транзакционно в PostgreSQL по событиям истории. 11-я публикация получает **429 RATE_LIMITED** с `Retry-After` в секундах. Ошибки не расходуют квоту. Не удаляйте события API-публикаций за последний час. Снятие с публикации и расписание остаются в админке.

## FAQ: ссылки и форматирование

В `faq[].answer` поддерживается inline Markdown: `[тарифы](/pricing)`, `**жирный**`, `*курсив*`. Заголовки не становятся HTML-заголовками; изображения и исходные HTML-теги не выводятся. Разрешены корневые относительные ссылки `/...` (кроме `//...`) и `https://...`. Для остальных схем и опасных адресов остаётся только текст ссылки. Внешние HTTPS-ссылки получают `rel="noopener nofollow" target="_blank"`; внутренние `/...` и HTTPS на `qr-s.ru`/`www.qr-s.ru` — без этих атрибутов. Переносы строк сохраняются.

Живая страница, `/preview` и API предпросмотра используют один рендерер. В FAQPage JSON-LD ответ — чистый текст: `смотри [тарифы](/pricing)` превращается в `смотри тарифы`, без markdown и HTML. Исходный `answer` в API/БД остаётся прежним.

Ответы: `{ "ok": true, "data": ... }` либо `{ "ok": false, "error": "Русское сообщение", "code": "..." }`. Данные не кешируются (`private, no-store`). Публичная схема без данных: `/api/v1/openapi.json`; полная OpenAPI 3.1 в `openapi.yaml`. Перегенерация: `node scripts/generate-blog-openapi.mjs`, затем `node --experimental-strip-types scripts/sync-public-openapi.mjs` (сохраняет QR API в общей схеме).

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

Meta Title — до 500 символов, Meta Description — до 2000, excerpt — до 10000, content — до 1000000 (всё тело запроса ≤1 MiB). FAQ — до 100 пунктов, вопрос до 500 и ответ до 10000 символов. JSON-LD принимает объект или строку, проверяется JSON.parse; невалидный JSON/неизвестные поля — 400. Изображения в тексте задаются Markdown `![alt](https://…)` или допустимым HTML; всё проходит действующий санитайзер. Обложка — `coverImageUrl` HTTP(S) и `coverImageAlt` до 1000 символов; null alt использует заголовок. Загрузка файлов и точечная смена alt доступны с этапа 4 (ниже).

Старый HTML остаётся только для чтения. Чтобы изменить тело, получите его через GET, подготовьте Markdown и передайте `format: "markdown", confirmConversion: true`. Исходный HTML сохранится в `legacyHtml` и версии №0. Массовой/автоматической конвертации нет. Вернуться к HTML можно штатным откатом в админке.

Запрещены (403): изменение slug после первой публикации и любые поля `status`, `published`, `publishedAt`, `scheduledAt`, `firstPublishedAt` в PATCH. Опубликованный текст обновляется сразу. Публикация сохранённой статьи доступна отдельным POST publish и отдельным ключом; снятие и расписание остаются в админке. DELETE/PUT статьи и методы чтения истории/журнала отсутствуют (405/404). Для редиректов доступны GET/POST; удаление остаётся в админке.

Публичная схема:

```bash
curl --fail-with-body -sS "$BASE/api/v1/openapi.json"
```

## Изображения (этап 4)

POST `/api/v1/articles/{id}/images`: multipart `file`, обязательный `alt` (1–1000 символов), `kind=content|cover`, текущая `version`. JPEG/PNG/GIF/WebP до 10 MiB и 40 млн пикселей; MIME проверяется по содержимому. GIF сохраняется первым кадром. Создаются WebP шириной до 480/960/1600 px без увеличения оригинала в прежнем S3. Ответ 201 содержит `image` (url, variants, размеры, srcset, безопасный figure) и обновлённую `article` с новой version. Content добавляется figure в конец Markdown; cover обновляет обложку. Для HTML доступна обложка; вставка в тело требует явной конвертации в Markdown. При конфликте 409 новые объекты удаляются.

```bash
curl --fail-with-body -sS --config "$ARTICLE_CURL_CONFIG" \
  -F 'file=@image.png' -F 'alt=Описание картинки' -F 'kind=content' -F 'version=1' \
  "$BASE/api/v1/articles/$ARTICLE_ID/images"
```

PATCH того же URL меняет только alt обложки/совпадающих изображений по точному `url`. Работает с существующим HTML без конвертации; кодовые примеры и остальные поля остаются прежними. Сначала получите актуальную version. Создаётся версия и событие с API-автором.

```bash
curl --fail-with-body -sS --config "$ARTICLE_CURL_CONFIG" -X PATCH \
  -H 'Content-Type: application/json' --data-binary @- "$BASE/api/v1/articles/$ARTICLE_ID/images" <<'JSON'
{"version":2,"url":"https://s3.mvmolkov.ru/path/image.webp","alt":"Уточнённое описание","comment":"Исправлен alt"}
JSON
```

## Редиректы (этап 4)

GET `/api/v1/redirects` возвращает список, в том числе перенесённые четыре 301 и информационные защищённые системные правила 308. POST принимает `source`, `target`, необязательный `comment` и создаёт 301 с API-автором в журнале. Source — путь сайта без query/hash; target — путь или HTTP(S) URL. Внутренние пути нормализуются по слешам и регистру; внешние пути сохраняют регистр. Занятые опубликованные/запланированные страницы и системные/QR-маршруты защищены. Циклы и цепочки отклоняются, сообщение предлагает конечный адрес. DELETE доступен только администратору в интерфейсе.

```bash
curl --fail-with-body -sS --config "$ARTICLE_CURL_CONFIG" "$BASE/api/v1/redirects"
curl --fail-with-body -sS --config "$ARTICLE_CURL_CONFIG" \
  -H 'Content-Type: application/json' --data-binary @- "$BASE/api/v1/redirects" <<'JSON'
{"source":"/blog/old-example","target":"/blog/new-example","comment":"Переезд статьи"}
JSON
```

Методы изображений и редиректов используют тот же редакционный ключ и общий лимит 60 запросов в минуту. Для публикации требуется отдельный ключ, описанный выше.

## ТЗ-07: отдельная загрузка, замена и предпросмотр (OpenAPI 1.2.0)

Тот же Bearer-ключ и общий лимит 60 запросов/мин. Загрузить файл без изменения статьи:

```bash
curl https://qr-s.ru/api/v1/images \
  -H "Authorization: Bearer $ARTICLE_API_KEY" \
  -F 'file=@picture.png' -F 'alt=Описание картинки'
```

Ответ `data`: `url` крупнейшего WebP, `variants` (url/width/height), `srcset`, размеры, alt и готовый `figure`. `kind=content` по умолчанию, можно `cover`. Те же ограничения: 10 MiB, 40 млн пикселей, JPEG/PNG/GIF/WebP с проверкой MIME; WebP 480/960/1600 без увеличения, GIF — первый кадр. Статья/версия не создаются, загрузка записывается в журнал с автором API.

Заменить все изображения/обложку с **точным** прежним URL (без `newUrl` — прежняя смена alt):

```bash
curl -X PATCH "https://qr-s.ru/api/v1/articles/$ARTICLE_ID/images" \
  -H "Authorization: Bearer $ARTICLE_API_KEY" -H 'Content-Type: application/json' \
  --data '{"version":3,"url":"https://example.org/old.webp","newUrl":"https://s3.mvmolkov.ru/example/new-1600.webp","alt":"Новое описание","minorEdit":true,"comment":"Заменена иллюстрация"}'
```

`version` обязательна: устаревшая версия — 409, URL не найден — 404. `newUrl` — HTTP(S) без credentials и пробелов. Загруженный через API файл получает свои srcset/размеры; для внешнего URL старые srcset/sizes/width/height удаляются. Меняются только атрибуты совпавших img или inline Markdown-картинки и обложка. Остальные исходные байты HTML/якоря, формат и legacyHtml сохраняются; HTML не требует конвертации. Кодовые примеры пропускаются. Создаются версия и событие с автором API. `minorEdit=true` сохраняет `contentUpdatedAt` (дату сайта/sitemap); `updatedAt` — служебная дата сохранения версии. Без minorEdit существенная замена обновляет редакционную дату. Даты публикации/расписания не меняются.

Предпросмотр сохранённого тела: POST с `{}`; временного — с `content`, `format` и/или `faq`:

```bash
curl -X POST "https://qr-s.ru/api/v1/articles/$ARTICLE_ID/preview" \
  -H "Authorization: Bearer $ARTICLE_API_KEY" -H 'Content-Type: application/json' \
  --data '{"content":"## Новый раздел {#section}\n\nТекст","format":"markdown"}'
```

Ответ `data.html` и `data.items` (оглавление) соответствует рендереру сайта. Предпросмотр не меняет статью, даты, версии, журнал или ссылки предпросмотра; учитывается только использование ключа. Неизвестные поля отклоняются. Редакционный ключ по-прежнему не разрешает публикацию, расписание и удаление.

## ТЗ-08: удаление изображения (OpenAPI 1.3.0)

Тот же `PATCH /api/v1/articles/{id}/images`, Bearer и общий лимит 60/мин. Для удаления передайте `remove: true` вместо `alt/newUrl`. `version` обязательна; сохранение, новая версия и событие `image_remove` с URL и автором `API: <имя ключа>` атомарны. `minorEdit: true` сохраняет редакционную дату (видимую дату, JSON-LD dateModified и sitemap lastmod); без флага удаление считается содержательной правкой.

```bash
curl -X PATCH "$BASE/api/v1/articles/$ARTICLE_ID/images" \
  -H "Authorization: Bearer $BLOG_API_TOKEN" \
  -H 'Content-Type: application/json' --data-binary @- <<'JSON'
{"version":12,"url":"https://s3.mvmolkov.ru/qr/blog/content/UMbjoWh-Pkyz.webp","remove":true,"minorEdit":true,"comment":"Удалена таблица-дубль"}
JSON
```

Сопоставляется точный `src` или URL одного из вариантов `srcset`. Если `<img>` — единственное медиа в `<figure>`, удаляется вся figure с figcaption. Иначе удаляется только img и пустые обёртки a/p. Остальной исходник остаётся побайтно прежним, HTML не конвертируется, `legacyHtml` и S3-объекты сохраняются. Поддерживаются обычные Markdown `![alt](url)` и raw HTML figure/img. Примеры внутри code/pre, fenced/indented/inline code, HTML-комментарии и атрибуты не считаются изображениями.

При нескольких изображениях с этим URL — **409**, `details.count` и русское пояснение. Для удаления всех добавьте `"all":true`. URL не найден — **404**; URL совпадает с обложкой — **400**, «Для обложки используйте coverImageUrl». Устаревшая версия — **409**, без действующего Bearer — **401**, лимит — **429** с Retry-After. Смешивать `remove` с `alt/newUrl` нельзя. Откат предыдущей версии в админке возвращает исходный content байт в байт; обычный откат считается редакционным изменением.

Предпросмотр без сохранения тем же серверным кодом:

```bash
curl -X POST "$BASE/api/v1/articles/$ARTICLE_ID/preview" \
  -H "Authorization: Bearer $BLOG_API_TOKEN" \
  -H 'Content-Type: application/json' --data-binary @- <<'JSON'
{"imageRemoval":{"url":"https://s3.mvmolkov.ru/qr/blog/content/UMbjoWh-Pkyz.webp","remove":true}}
JSON
```

Ответ: `html`, `items` и `content` после удаления. При обычном предпросмотре без `imageRemoval` контракт не меняется. `/api/admin/blog/preview` принимает такое же `imageRemoval` вместе с обязательными `content/format` и необязательным `coverImageUrl`; требует сессию администратора и CSRF. Предпросмотр не создаёт версий, событий и изменений дат. Отдельная кнопка удаления в редакторе не добавлена (необязательный пункт ТЗ).

Локальная HTTP-приёмка на выделенной БД `qr_tz08`, синтетическом JWT `local-tz06-*` и сервере `BLOG_TEST_ORIGIN`:

```bash
node --experimental-strip-types --import ./scripts/register-src-alias.mjs scripts/verify-blog-image-remove.mjs
```

Скрипт создаёт и удаляет только собственные тестовые записи; production отклоняется по умолчанию. Два разных API-ключа проверяют реальный CAS статьи. На восстановленной изолированной копии разрешён явный `BLOG_REMOVE_ISOLATED=explicit-tz08-restored-copy` с синтетическим JWT; это не разрешение запускать скрипт на production.

## ТЗ-08: публичные URL изображений блога

Все новые загрузки (отдельный `/api/v1/images`, article-scoped POST images и админка) возвращают `https://qr-s.ru/media/blog/covers|content/<file>.webp` в `url`, `variants`, `srcset` и `figure`. Объекты остаются в прежнем S3 под теми же ключами `qr/blog/...`; WebP 480/960/1600 и размеры сохранены.

```bash
curl -I 'https://qr-s.ru/media/blog/content/<file>-960.webp'
curl -I -H 'If-None-Match: "<etag-из-предыдущего-ответа>"' \
  'https://qr-s.ru/media/blog/content/<file>-960.webp'
```

Маршрут публичный: Bearer не нужен, cookie не устанавливаются, редиректа на S3 нет. Отдаёт WebP/PNG/JPEG/GIF, `Cache-Control: public, max-age=31536000, immutable`, `Content-Length`, `ETag`, `Last-Modified`; HEAD без тела, условный запрос — 304. Разрешены только covers/content, допустимые имена и расширения, произвольные ключи/вложенные пути/SVG не отдаются. Отсутствующий файл — 404, временная ошибка хранилища — 502 без внутренних адресов. Кеш процесса ограничен 64 MiB/128 объектами, параллельные чтения одного объекта объединяются.

Старые статьи не мигрируют: API GET по-прежнему возвращает исходный `content/coverImageUrl`, где может оставаться S3 URL. Публичная страница и preview переписывают image src/srcset и метаданные при рендере. Исходные даты и версия не меняются от этого переписывания. Новый публичный URL и исходный S3 URL считаются эквивалентными при точечной замене/удалении изображения; прочие домены и разные query/hash не смешиваются. Старые S3 URL продолжают работать.

JSON-LD BlogPosting.image — ImageObject с URL и реальными width/height. Sitemap получает image:loc для обложки и изображений тела; редакционный lastmod остаётся прежним. Четыре ранее исключённых адреса-редиректа не возвращаются в sitemap: изображения добавляются к 40 индексируемым статьям, даты проверяются у всех 44 записей. Favicon в `qr/site/` находится вне этого маршрута и не меняется.

HTTP-проверка с синтетическим S3 на отдельной БД `qr_tz08`:

```bash
node --experimental-strip-types --import ./scripts/register-src-alias.mjs scripts/verify-blog-media.mjs
```

`scripts/verify-blog-media-release.mjs` сохраняет read-only baseline пяти публичных страниц, всех исходников/дат и sitemap; `--compare <private-baseline.json>` проверяет, что в телах поменялись только URL картинок, а H2/id, ссылки, таблицы, даты и URL статей совпадают. Снимки хранятся вне Git, mode 0600. В восстановленной копии используется внутренний S3-стенд с зеркалом публичных картинок, синтетические JWT/S3-настройки и изолированная Docker-сеть; внешние workers не запускаются.
