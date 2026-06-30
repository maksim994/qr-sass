# API блога qr-s.ru — инструкция для автоматической публикации статей

Документ для ИИ-агента: как создавать, публиковать и обновлять статьи блога на [qr-s.ru](https://qr-s.ru) через HTTP API.

---

## Базовые сведения

| Параметр | Значение |
|----------|----------|
| Базовый URL | `https://qr-s.ru` (или `APP_URL` окружения) |
| Префикс API | `/api/admin/blog` |
| Формат ответов | JSON: `{ "ok": true, "data": ... }` или `{ "ok": false, "error": "...", "code": "..." }` |
| Авторизация | `Authorization: Bearer qre_<api_key>` |
| Требование к ключу | Владелец workspace с API-ключом должен быть **администратором** (`isAdmin`) |

Альтернатива: сессия администратора (cookie) — используется в веб-админке `/admin/blog`.

---

## Авторизация

```http
Authorization: Bearer qre_xxxxxxxxxxxxxxxx
Content-Type: application/json
```

API-ключ создаётся в личном кабинете: **Dashboard → API-ключи**. Ключ показывается один раз при создании.

---

## Эндпоинты

### 1. Список статей

```http
GET /api/admin/blog
```

**Ответ `data`:** массив объектов с полями `id`, `slug`, `title`, `excerpt`, `authorName`, `readingTimeMinutes`, `publishedAt`, `createdAt`, `updatedAt`.

---

### 2. Создание статьи

```http
POST /api/admin/blog
Content-Type: application/json
```

**Тело запроса:**

| Поле | Тип | Обязательно | Описание |
|------|-----|-------------|----------|
| `title` | string | да | Заголовок статьи |
| `slug` | string | да | URL-часть (`/blog/{slug}`). Нормализуется: латиница, дефисы |
| `content` | string | да | HTML-контент статьи |
| `excerpt` | string \| null | нет | Краткое описание для списка статей |
| `metaTitle` | string \| null | нет | SEO title (по умолчанию — заголовок) |
| `metaDescription` | string \| null | нет | SEO description (до ~160 символов) |
| `coverImageUrl` | string \| null | нет | URL обложки (загрузить через `/upload`) |
| `authorName` | string \| null | нет | Имя автора на странице и в микроразметке |
| `readingTimeMinutes` | number \| null | нет | Время чтения в минутах (1–999). Если не передано — считается автоматически (~200 слов/мин) |
| `structuredData` | object \| string \| null | нет | JSON-LD микроразметка. Если не передано — генерируется автоматически |
| `publishedAt` | string \| null | нет | ISO-дата публикации. `null` — черновик. Текущая дата — опубликовать сейчас |

**Пример — опубликованная статья:**

```json
{
  "title": "Как использовать динамические QR-коды в маркетинге",
  "slug": "dinamicheskie-qr-kody-v-marketinge",
  "metaTitle": "Динамические QR-коды в маркетинге — гайд qr-s.ru",
  "metaDescription": "Как бизнесу использовать динамические QR-коды: от печати до аналитики переходов.",
  "excerpt": "Разбираем сценарии применения динамических QR-кодов для рекламы, меню и визиток.",
  "authorName": "Команда qr-s.ru",
  "readingTimeMinutes": 7,
  "content": "<h2>Введение</h2><p>Динамический QR-код позволяет менять ссылку без перепечатки материалов.</p>",
  "coverImageUrl": "https://cdn.example.com/qr/blog/covers/abc123.webp",
  "publishedAt": "2026-06-30T10:00:00.000Z"
}
```

**Ответ `data`:** полный объект созданной статьи (включая `id`, `readingTimeMinutes`, `createdAt`).

**Ошибки:**
- `409 CONFLICT` — slug уже занят
- `400 VALIDATION_ERROR` — не заполнены обязательные поля или невалидный JSON в `structuredData`

---

### 3. Обновление статьи

```http
PATCH /api/admin/blog/{id}
Content-Type: application/json
```

Передаются только изменяемые поля (те же имена, что при создании).

**Публикация черновика:** `"publishedAt": "2026-06-30T12:00:00.000Z"`  
**Снятие с публикации:** `"publishedAt": null`

При изменении `content` без явного `readingTimeMinutes` время чтения пересчитывается автоматически.

---

### 4. Удаление статьи

```http
DELETE /api/admin/blog/{id}
```

**Ответ:** `{ "ok": true, "data": { "deleted": true } }`

---

### 5. Загрузка обложки

```http
POST /api/admin/blog/upload
Content-Type: multipart/form-data
```

| Поле формы | Тип | Описание |
|------------|-----|----------|
| `file` | File | JPEG, PNG, GIF, WebP. Макс. 10 МБ |

**Ответ:**

```json
{
  "ok": true,
  "data": {
    "url": "https://.../qr/blog/covers/abc123.webp",
    "key": "qr/blog/covers/abc123.webp"
  }
}
```

Используйте `url` в поле `coverImageUrl` при создании/обновлении статьи.

---

### 6. Загрузка изображения для текста статьи

```http
POST /api/admin/blog/upload-content
Content-Type: multipart/form-data
```

Формат такой же, как у обложки. Файлы сохраняются в `qr/blog/content/`.

**Вставка в HTML:**

```html
<p><img src="https://.../qr/blog/content/xyz789.webp" alt="Описание изображения" /></p>
```

---

## Рекомендуемый workflow для ИИ

```
1. (Опционально) Загрузить обложку     → POST /api/admin/blog/upload
2. (Опционально) Загрузить картинки    → POST /api/admin/blog/upload-content
3. Собрать HTML-контент с <h2>, <p>, <ul>, <img>
4. Сгенерировать slug из заголовка (латиница, дефисы)
5. Создать статью                      → POST /api/admin/blog
6. Проверить на сайте                  → https://qr-s.ru/blog/{slug}
```

### Черновик vs публикация

- **Черновик:** `"publishedAt": null` — статья не видна на сайте
- **Публикация:** `"publishedAt": "<ISO-дата>"` — статья появляется в `/blog` и на главной

При публикации, если настроен IndexNow, URL автоматически отправляется в поисковики.

---

## Формат HTML-контента

Контент хранится и отображается как HTML. Рекомендуемые теги:

| Элемент | Тег |
|---------|-----|
| Абзац | `<p>...</p>` |
| Подзаголовок 2 уровня | `<h2>...</h2>` |
| Подзаголовок 3 уровня | `<h3>...</h3>` |
| Список | `<ul><li>...</li></ul>` или `<ol>` |
| Ссылка | `<a href="https://...">текст</a>` |
| Цитата | `<blockquote><p>...</p></blockquote>` |
| Изображение | `<img src="URL" alt="описание" />` |
| Таблица | `<table><thead>...</thead><tbody>...</tbody></table>` |

**Не используйте:** `<script>`, inline-обработчики событий, опасный HTML.

---

## Slug (URL)

Правила нормализации на сервере:
- lowercase
- пробелы → дефисы
- только `a-z`, `0-9`, `-`

**Примеры:**

| Заголовок | slug |
|-----------|------|
| Как создать QR-код | `kak-sozdat-qr-kod` |
| QR codes for business | `qr-codes-for-business` |

ИИ должен **сам транслитерировать** кириллицу в латиницу до отправки.

---

## SEO-поля

| Поле | Назначение | Рекомендация |
|------|------------|--------------|
| `metaTitle` | `<title>`, Open Graph | 50–60 символов, ключевое слово в начале |
| `metaDescription` | meta description, OG | 140–160 символов, призыв к действию |
| `excerpt` | Превью в списке блога | 2–3 предложения, без HTML |

Если `metaTitle` / `metaDescription` не заданы — подставляются `title` и `excerpt`.

---

## Микроразметка (`structuredData`)

Опциональное поле JSON-LD (schema.org). Если **не передавать** — сайт генерирует разметку `Article` + `WebPage` автоматически.

**Когда передавать вручную:** нестандартная разметка (FAQ, HowTo, несколько сущностей).

**Пример:**

```json
{
  "structuredData": {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Заголовок",
    "author": { "@type": "Person", "name": "Иван Иванов" },
    "datePublished": "2026-06-30T10:00:00.000Z"
  }
}
```

Можно передать как объект или как JSON-строку. Должен быть валидный JSON-объект (не массив).

---

## Автор и время чтения

| Поле | Поведение |
|------|-----------|
| `authorName` | Отображается в шапке статьи. В автогенерируемой микроразметке — `Person` |
| `readingTimeMinutes` | Число 1–999. Без поля — авторасчёт из `content` |

---

## Примеры curl

### Создать и опубликовать статью

```bash
curl -X POST "https://qr-s.ru/api/admin/blog" \
  -H "Authorization: Bearer qre_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Тестовая статья",
    "slug": "testovaya-statya",
    "content": "<p>Текст статьи.</p>",
    "authorName": "Редакция",
    "publishedAt": "2026-06-30T12:00:00.000Z"
  }'
```

### Загрузить картинку в текст

```bash
curl -X POST "https://qr-s.ru/api/admin/blog/upload-content" \
  -H "Authorization: Bearer qre_YOUR_KEY" \
  -F "file=@./image.jpg"
```

### Обновить статью

```bash
curl -X PATCH "https://qr-s.ru/api/admin/blog/CLXXXXXXXX" \
  -H "Authorization: Bearer qre_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"readingTimeMinutes": 5}'
```

---

## Чеклист качества статьи (для ИИ)

- [ ] Заголовок конкретный, с пользой для читателя
- [ ] `slug` уникальный, латиница, без спецсимволов
- [ ] `metaDescription` 140–160 символов
- [ ] Контент структурирован: `h2` → блоки, списки где уместно
- [ ] Изображения с осмысленным `alt`
- [ ] Обложка загружена и указана в `coverImageUrl`
- [ ] `excerpt` — краткое превью без HTML
- [ ] `authorName` заполнен
- [ ] `publishedAt` установлен для публикации
- [ ] Внутренние ссылки на qr-s.ru где уместно (`/dashboard/create`, `/blog/...`)

---

## Коды ошибок

| code | HTTP | Описание |
|------|------|----------|
| `UNAUTHORIZED` | 401 | Нет авторизации или пользователь не admin |
| `BAD_REQUEST` | 400 | Невалидный JSON |
| `VALIDATION_ERROR` | 400 | Ошибка валидации полей |
| `CONFLICT` | 409 | slug уже существует |
| `NOT_FOUND` | 404 | Статья не найдена |
| `INTERNAL_ERROR` | 500 | Ошибка сервера (загрузка файла, БД) |

---

## Деплой и миграция БД

После обновления кода на сервере выполнить:

```bash
npm run prisma:push
```

Добавляются nullable-поля `authorName`, `structuredData` — существующие статьи не ломаются.
