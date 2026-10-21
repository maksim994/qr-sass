// The JSON serialization is valid YAML 1.2. Both served and repository schemas share this source.
import { writeFileSync } from "node:fs";
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const nullable = (type, extra = {}) => ({ type: [type, "null"], ...extra });
const date = nullable("string", { format: "date-time" });
const fields = {
  title: { type: "string", minLength: 1, maxLength: 500 },
  slug: {
    type: "string",
    minLength: 1,
    maxLength: 200,
    description:
      "Нормализуется в lowercase a-z0-9-. Нельзя менять после первой публикации.",
  },
  content: {
    type: "string",
    maxLength: 1_000_000,
    description:
      "Исходный HTML или Markdown, inline images: ![alt](https://…). Старый HTML меняется только при явном переходе на Markdown с confirmConversion=true.",
  },
  format: { type: "string", enum: ["html", "markdown"] },
  metaTitle: nullable("string", { maxLength: 500 }),
  metaDescription: nullable("string", { maxLength: 2000 }),
  excerpt: nullable("string", { maxLength: 10000 }),
  coverImageUrl: nullable("string", {
    description: "HTTP(S) URL обложки; null/пустая строка убирает обложку.",
  }),
  coverImageAlt: nullable("string", { maxLength: 1000 }),
  authorName: nullable("string", { maxLength: 300 }),
  categoryId: nullable("string", { maxLength: 200 }),
  tags: { type: "array", maxItems: 30, items: { type: "string", minLength: 1, maxLength: 100 }, description: "Теги для тематического подбора; приводятся к нижнему регистру." },
  relatedArticleIds: { type: "array", uniqueItems: true, maxItems: 20, items: { type: "string", minLength: 1, maxLength: 200 }, description: "Ручной порядок связанных статей (приоритет перед рубрикой/тегами). Блок показывает 3 опубликованные статьи; текущая и редиректы исключаются." },
  readingTimeMinutes: nullable("integer", { minimum: 1, maximum: 999 }),
  structuredData: {
    description:
      "JSON-LD: объект, JSON-строка объекта, null или пустая строка для удаления. Невалидный JSON — 400.",
    oneOf: [
      { type: "object", additionalProperties: true },
      { type: "string" },
      { type: "null" },
    ],
  },
  faq: {
    type: "array",
    maxItems: 100,
    items: {
      type: "object",
      additionalProperties: false,
      required: ["question", "answer"],
      properties: {
        question: { type: "string", minLength: 1, maxLength: 500 },
        answer: { type: "string", minLength: 1, maxLength: 10000 },
      },
    },
  },
  showPrintSizeIntro: { type: "boolean" },
  minorEdit: {
    type: "boolean",
    description:
      "Сохраняет редакционную дату. No-op/пробелы сохраняют дату независимо от флага.",
  },
  confirmConversion: {
    type: "boolean",
    description:
      "Явное подтверждение html→markdown; исходный HTML сохраняется в legacyHtml.",
  },
  comment: { type: "string", maxLength: 2000 },
};
const version = {
  type: "integer",
  minimum: 0,
  description:
    "Последний номер редакционной версии. 0 до первого сохранения истории. PATCH требует точное совпадение; конфликт — 409.",
};
const summary = {
  type: "object",
  required: ["id", "slug", "title", "status", "format", "version"],
  properties: {
    id: { type: "string" },
    slug: { type: "string" },
    title: { type: "string" },
    status: { type: "string", enum: ["draft", "scheduled", "published"] },
    format: fields.format,
    version,
    excerpt: nullable("string"),
    updatedAt: { type: "string", format: "date-time" },
    contentUpdatedAt: date,
    createdAt: { type: "string", format: "date-time" },
    publishedAt: date,
    scheduledAt: date,
  },
};
const response = (description, schema) => ({
  description,
  content: { "application/json": { schema } },
});
const success = (schema) => ({
  type: "object",
  required: ["ok", "data"],
  properties: { ok: { const: true }, data: schema },
});
const errors = Object.fromEntries(
  [
    [400, "Некорректный запрос / JSON-LD"],
    [401, "Нет действующего ключа"],
    [403, "Запрещённая операция / опубликованный slug"],
    [404, "Статья не найдена"],
    [409, "Конфликт версии или slug"],
    [429, "60 запросов в минуту"],
    [500, "Ошибка сервера"],
  ].map(([code, label]) => [
    code,
    {
      ...response(label, ref("Error")),
      ...(code === 429
        ? {
            headers: {
              "Retry-After": {
                description: "Секунд до следующего окна",
                schema: { type: "integer", minimum: 1 },
              },
            },
          }
        : {}),
    },
  ]),
);
const operation = (operationId, summary, extras) => ({
  operationId,
  summary,
  security: [{ ArticleBearer: [] }],
  tags: ["Articles"],
  ...extras,
});
const spec = {
  openapi: "3.1.0",
  info: {
    title: "QR-S Article API",
    version: "1.0.0",
    description:
      "Редакционные ключи управляются в /admin/blog/tokens. Только Bearer, 60 запросов/минуту, без публикации/удаления/расписания. Сохранение статьи создаёт версию с автором API: <имя ключа>. Черновик изменений хранится отдельно, история меняется только при публикации администратором. Отозванные ключи возвращают 401. Ответы с данными private,no-store. Публичная схема не содержит данных или секретов.",
    license: { name: "Proprietary", identifier: "LicenseRef-Proprietary" },
  },
  servers: [{ url: "https://qr-s.ru" }],
  tags: [{ name: "Articles", description: "Чтение и изменение статей" }],
  paths: {
    "/api/v1/articles": {
      get: operation("listArticles", "Список статей", {
        parameters: [
          ...["status", "slug"].map((name) => ({
            name,
            in: "query",
            schema:
              name === "status"
                ? { type: "string", enum: ["draft", "scheduled", "published"] }
                : { type: "string", maxLength: 200 },
          })),
          {
            name: "page",
            in: "query",
            schema: {
              type: "integer",
              minimum: 1,
              maximum: 1000000,
              default: 1,
            },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
          },
        ],
        responses: {
          ...errors,
          200: response(
            "Список",
            success({
              type: "object",
              required: ["items", "total", "page", "limit"],
              properties: {
                items: { type: "array", items: ref("ArticleSummary") },
                total: { type: "integer" },
                page: { type: "integer" },
                limit: { type: "integer" },
              },
            }),
          ),
        },
      }),
      post: operation("createArticle", "Создать черновик", {
        description:
          "Переданный status игнорируется: результат всегда draft. published/publishedAt/scheduledAt не принимаются (400). format по умолчанию markdown.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: ref("ArticleCreate") } },
        },
        responses: {
          ...errors,
          201: response("Черновик создан", success(ref("Article"))),
        },
      }),
    },
    "/api/v1/articles/{id}": {
      parameters: [
        { name: "id", in: "path", required: true, schema: { type: "string" } },
      ],
      get: operation("getArticle", "Все поля статьи и номер версии", {
        responses: {
          ...errors,
          200: response("Статья", success(ref("Article"))),
        },
      }),
      patch: operation("patchArticle", "Изменить статью", {
        description:
          "version обязательна. Можно менять опубликованный текст, FAQ, JSON-LD, метаданные и изображения с alt. Статус/даты публикации/расписание — 403 даже при прежнем значении. Изменение slug после первой публикации — 403. DELETE/PUT отсутствуют (405).",
        requestBody: {
          required: true,
          content: { "application/json": { schema: ref("ArticlePatch") } },
        },
        responses: {
          ...errors,
          200: response("Новая версия сохранена", success(ref("Article"))),
        },
      }),
    },
  },
  components: {
    securitySchemes: {
      ArticleBearer: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "qrs_blog_<secret>",
      },
    },
    schemas: {
      Error: {
        type: "object",
        required: ["ok", "error", "code"],
        properties: {
          ok: { const: false },
          error: { type: "string", description: "Сообщение по-русски" },
          code: { type: "string" },
          details: { type: "object", properties: { count: { type: "integer", minimum: 1 } }, additionalProperties: true },
        },
      },
      ArticleSummary: summary,
      Article: {
        ...summary,
        properties: {
          ...summary.properties,
          ...Object.fromEntries(
            Object.entries(fields).filter(
              ([key]) =>
                !["minorEdit", "confirmConversion", "comment"].includes(key),
            ),
          ),
          renderedHtml: nullable("string"),
          legacyHtml: nullable("string"),
          structuredData: nullable("string"),
          firstPublishedAt: date,
          views: { type: "integer" },
          likes: { type: "integer" },
          createdById: nullable("string"),
        },
      },
      ArticleCreate: {
        type: "object",
        additionalProperties: false,
        required: ["title", "slug", "content"],
        properties: { ...fields, status: summary.properties.status },
      },
      ArticlePatch: {
        type: "object",
        additionalProperties: false,
        required: ["version"],
        properties: { ...fields, version },
      },
    },
  },
};
spec.info.version = "1.3.0";
spec.tags.push(
  {
    name: "Redirects",
    description: "Редакционные 301 и прежние системные правила",
  },
  {
    name: "Images",
    description: "Загрузка WebP и изменение alt с версией статьи",
  },
);
const redirectRule = {
  type: "object",
  required: ["id", "source", "target", "code", "actorName", "locked"],
  properties: {
    id: { type: "string" },
    source: { type: "string" },
    target: { type: "string" },
    code: { type: "integer", enum: [301, 308] },
    comment: nullable("string"),
    actorName: { type: "string" },
    createdAt: date,
    locked: { type: "boolean" },
  },
};
spec.components.schemas.Redirect = redirectRule;
spec.components.schemas.RedirectCreate = {
  type: "object",
  additionalProperties: false,
  required: ["source", "target"],
  properties: {
    source: {
      type: "string",
      minLength: 1,
      maxLength: 2000,
      description:
        "Путь от /, без query/hash. Регистр/слеш нормализуются. Опубликованные/запланированные страницы и системные/QR маршруты защищены.",
    },
    target: {
      type: "string",
      minLength: 1,
      maxLength: 4000,
      description:
        "Конечный путь или HTTP(S) URL; без credentials, циклов и цепочек. Query назначения имеет приоритет, иначе сохраняется query запроса.",
    },
    comment: { type: "string", maxLength: 2000 },
  },
};
spec.paths["/api/v1/redirects"] = {
  get: operation("listRedirects", "Список редиректов", {
    tags: ["Redirects"],
    responses: {
      ...errors,
      200: response(
        "Включая locked системные 301/308",
        success({ type: "array", items: ref("Redirect") }),
      ),
    },
  }),
  post: operation("createRedirect", "Создать 301", {
    tags: ["Redirects"],
    description:
      "Создание записывается в журнал с API-автором. Цепочки/циклы отклоняются; конечный переход предложен в сообщении. DELETE/PUT/PATCH отсутствуют (405).",
    requestBody: {
      required: true,
      content: { "application/json": { schema: ref("RedirectCreate") } },
    },
    responses: {
      ...errors,
      201: response("Редирект создан", success(ref("Redirect"))),
    },
  }),
};
spec.components.schemas.BlogImage = {
  type: "object",
  required: [
    "id",
    "url",
    "alt",
    "width",
    "height",
    "variants",
    "figure",
    "srcset",
  ],
  properties: {
    id: { type: "string" },
    url: { type: "string", format: "uri" },
    alt: { type: "string" },
    width: { type: "integer" },
    height: { type: "integer" },
    figure: { type: "string" },
    srcset: { type: "string" },
    variants: {
      type: "array",
      items: {
        type: "object",
        required: ["url", "width", "height"],
        properties: {
          url: { type: "string", format: "uri" },
          key: { type: "string" },
          width: { type: "integer" },
          height: { type: "integer" },
        },
      },
    },
  },
};
spec.paths["/api/v1/articles/{id}/images"] = {
  parameters: [
    { name: "id", in: "path", required: true, schema: { type: "string" } },
  ],
  post: operation(
    "uploadArticleImage",
    "Загрузить изображение и создать версию",
    {
      tags: ["Images"],
      description:
        "JPEG/PNG/GIF/WebP ≤10 MiB, ≤40 млн пикселей; GIF — первый кадр. WebP 480/960/1600 без увеличения. kind=cover обновляет обложку/alt; content дописывает figure в Markdown (HTML требует явной предварительной конвертации). version обязательна, 409 при конфликте. Статус статьи сохраняется, публикация запрещена. Объекты в прежнем S3, публичные url/variants/srcset/figure на qr-s.ru/media/blog/. Исходные файлы не меняются.",
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["file", "alt", "kind", "version"],
              properties: {
                file: { type: "string", format: "binary" },
                alt: { type: "string", minLength: 1, maxLength: 1000 },
                kind: { type: "string", enum: ["cover", "content"] },
                version,
              },
            },
          },
        },
      },
      responses: {
        ...errors,
        201: response(
          "Изображение и сохранённая статья",
          success({
            type: "object",
            properties: { image: ref("BlogImage"), article: ref("Article") },
            required: ["image", "article"],
          }),
        ),
      },
    },
  ),
  patch: operation(
    "patchArticleImage",
    "Заменить, удалить изображение или изменить alt",
    {
      tags: ["Images"],
      description:
        "URL должен совпадать с обложкой или картинкой в исходном тексте. newUrl (HTTP(S), необязателен) заменяет точный URL и alt всех совпавших изображений/обложки. srcset/размеры берутся из загруженного файла, для внешнего URL устаревшие атрибуты удаляются. minorEdit=true сохраняет contentUpdatedAt; updatedAt — служебное время записи. Меняются только соответствующие изображения; поддерживаются готовые figure, HTML img и обычные inline Markdown images. HTML не конвертируется; остальные исходные фрагменты сохраняются. Создаётся версия и запись журнала, публикационные права не меняются. remove=true удаляет по точному src или кандидату srcset. Если img — единственное медиа figure, удаляется figure с подписью; иначе img и пустые обёртки a/p. Markdown inline images и raw HTML поддерживаются. Повторный URL: 409 с details.count; all=true удаляет все. URL не найден: 404; URL обложки: 400 (используйте coverImageUrl). S3-объекты и legacyHtml сохраняются. Версия и событие image_remove с URL записываются в одной CAS-транзакции.",
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { oneOf: [ref("ArticleImageReplace"), ref("ArticleImageRemove")] },
          },
        },
      },
      responses: {
        ...errors,
        200: response("Статья с новой версией", success(ref("Article"))),
      },
    },
  ),
};
spec.components.schemas.ArticleImageReplace = {
  type: "object", additionalProperties: false, required: ["version", "url", "alt"],
  properties: { version, url: {type:"string",minLength:1,maxLength:4000},
    alt:{type:"string",minLength:1,maxLength:1000}, newUrl:{type:"string",format:"uri",maxLength:4000,description:"HTTP(S) без credentials/пробелов"},
    minorEdit: fields.minorEdit, comment: fields.comment },
};
spec.components.schemas.ArticleImageRemoval = {
  type: "object", additionalProperties: false, required: ["url", "remove"],
  properties: { url: {type:"string",minLength:1,maxLength:4000}, remove:{type:"boolean",const:true}, all:{type:"boolean",default:false} },
};
spec.components.schemas.ArticleImageRemove = {
  ...spec.components.schemas.ArticleImageRemoval, required:["version","url","remove"],
  properties: {...spec.components.schemas.ArticleImageRemoval.properties, version, minorEdit:fields.minorEdit, comment:fields.comment},
};
spec.paths["/api/v1/images"] = {
  post: operation("uploadImage", "Загрузить изображение без статьи", {
    tags: ["Images"],
    description: "Тот же Bearer и общий лимит 60/мин. Публичные URL: qr-s.ru/media/blog/, S3 остаётся хранилищем. Обязательные file/alt; kind необязателен, по умолчанию content. JPEG/PNG/GIF/WebP ≤10 MiB и ≤40 млн пикселей, MIME по байтам. WebP 480/960/1600 без увеличения, GIF — первый кадр. Возвращает url/variants/srcset/figure, пишет image_upload с автором API. Статьи/версии не создаются. DELETE/PUT/PATCH отсутствуют.",
    requestBody: { required: true, content: { "multipart/form-data": { schema: {
      type: "object", required: ["file", "alt"], properties: {
        file: {type:"string",format:"binary"}, alt:{type:"string",minLength:1,maxLength:1000},
        kind:{type:"string",enum:["cover","content"],default:"content"},
      },
    } } } },
    responses: { ...errors, 201: response("Изображение загружено", success(ref("BlogImage"))) },
  }),
};
spec.paths["/api/v1/articles/{id}/preview"] = {
  parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
  post: operation("previewArticle", "Отрендерить HTML без сохранения", {
    description: "Передайте JSON {} для сохранённого тела либо временные content/format/faq. imageRemoval={url,remove:true,all?} показывает удаление без сохранения тем же кодом, что PATCH; дополнительно возвращает изменённый исходник content, ошибки 400/404/409 совпадают с PATCH. Используется тот же рендерер, что на сайте. Ответ содержит html и items (оглавление). Статья, даты, версии, журнал и токены ссылок предпросмотра не меняются; учитывается только использование API-ключа. Публикационных полей нет.",
    requestBody: { required: true, content: { "application/json": { schema: {
      type: "object", additionalProperties: false, properties: { content: fields.content, format: fields.format, faq: fields.faq, imageRemoval:ref("ArticleImageRemoval") },
    } } } },
    responses: { ...errors, 200: response("Предпросмотр", success({
      type: "object", required: ["html", "items"], properties: {
        html: { type: "string" }, content: {type:"string",description:"Исходник после imageRemoval, только при запросе удаления"}, items: { type: "array", items: { type: "object", required: ["id", "text"], properties: { id: {type:"string"},text:{type:"string"} } } },
      },
    })) },
  }),
};
const mediaHeaders = {
  "Cache-Control": {description:"public, max-age=31536000, immutable",schema:{type:"string"}},
  ETag:{description:"ETag объекта, используется с If-None-Match",schema:{type:"string"}},
  "Last-Modified":{description:"Время изменения объекта в HTTP-date",schema:{type:"string"}},
};
spec.paths["/media/blog/{kind}/{file}"] = {
  parameters:[{name:"kind",in:"path",required:true,schema:{type:"string",enum:["covers","content"]}},{name:"file",in:"path",required:true,schema:{type:"string",pattern:"^[A-Za-z0-9_-]{1,200}\\.(webp|png|jpe?g|gif)$"}}],
  get: {operationId:"getBlogMedia",summary:"Публичное изображение блога",tags:["Images"],security:[],
    description:"Байты S3 на домене сайта, без редиректа и cookie. Только qr/blog/covers и qr/blog/content. Посторонние ключи, SVG и обход пути запрещены. Ограниченный кеш процесса, immutable HTTP-кеш. If-None-Match/If-Modified-Since поддерживаются.",
    parameters:[{name:"If-None-Match",in:"header",schema:{type:"string"}},{name:"If-Modified-Since",in:"header",schema:{type:"string"}}],
    responses:{200:{description:"Изображение",headers:mediaHeaders,content:Object.fromEntries(["image/webp","image/png","image/jpeg","image/gif"].map(type=>[type,{schema:{type:"string",format:"binary"}}]))},304:{description:"Объект не изменён",headers:mediaHeaders},404:{description:"Нет изображения/недопустимый путь"},502:{description:"Хранилище временно недоступно, внутренние адреса не раскрываются"}}},
  head:{operationId:"headBlogMedia",summary:"Метаданные изображения без тела",tags:["Images"],security:[],responses:{200:{description:"Метаданные",headers:mediaHeaders},304:{description:"Объект не изменён",headers:mediaHeaders},404:{description:"Изображение не найдено"},502:{description:"Хранилище недоступно"}}},
};
// TZ-09: pending changes use a separate resource and can only be published in admin.
spec.info.version = "1.4.0";
const revisionFields = Object.fromEntries(Object.entries(fields).filter(([key]) => !["slug", "minorEdit"].includes(key)));
spec.components.schemas.ArticleRevisionInput = {
  type: "object", additionalProperties: false,
  properties: { ...revisionFields, version: { ...version, description: "Необязательный номер живой версии для защиты от устаревшего чтения. Черновик не увеличивает номер истории." } },
};
spec.components.schemas.ArticlePendingRevision = {
  type: "object", required: ["id", "postId", "input", "snapshot", "baseUpdatedAt", "updatedAt", "createdAt", "actorName"],
  properties: {
    id: {type:"string"}, postId: {type:"string"},
    input: ref("ArticleRevisionInput"), snapshot: {type:"object",additionalProperties:true,description:"Полный снимок подготовленной версии для предпросмотра и сравнения."},
    baseUpdatedAt: {type:"string",format:"date-time"}, updatedAt:{type:"string",format:"date-time"}, createdAt:{type:"string",format:"date-time"}, actorName:{type:"string"},
  },
};
const revisionParams = [{name:"id",in:"path",required:true,schema:{type:"string"}}];
spec.paths["/api/v1/articles/{id}/revision"] = {
  parameters: revisionParams,
  put: operation("saveArticlePendingRevision", "Создать или обновить черновик изменений", {
    description:"Только для опубликованной статьи. Один черновик; переданные поля объединяются с предыдущими. Отсутствующие поля сохраняются. slug и поля публикации запрещены. Формат/явная конвертация HTML, FAQ, JSON-LD и лимиты совпадают с PATCH. Живая статья, sitemap, даты и история версий не меняются. Изменение живой статьи после создания черновика даёт 409; сохраните нужный текст, отмените черновик и создайте новый. Публикация доступна только администратору в интерфейсе.",
    requestBody:{required:true,content:{"application/json":{schema:ref("ArticleRevisionInput")}}},
    responses:{...errors,200:response("Сохранённый черновик",success(ref("ArticlePendingRevision")))},
  }),
  get: operation("getArticlePendingRevision", "Получить черновик изменений", {responses:{...errors,200:response("Черновик",success(ref("ArticlePendingRevision")))}}),
  delete: operation("cancelArticlePendingRevision", "Отменить черновик изменений", {
    description:"Удаляется только черновик и его секретные ссылки. Живая статья и история остаются. При отсутствии черновика — 404.",
    responses:{...errors,200:response("Черновик отменён",success({type:"object",required:["id"],properties:{id:{type:"string"}}}))},
  }),
};
spec.paths["/api/v1/articles/{id}/revision/preview"] = {
  parameters:revisionParams,
  post:operation("previewArticlePendingRevision", "Создать секретную ссылку на черновик изменений", {
    description:"Возвращает абсолютный url и относительный path. Показывает последнее сохранение черновика, без авторизации по ссылке, noindex/nofollow и private,no-store. Новая ссылка отзывает предыдущую ссылку этого черновика. Ссылки на живую сохранённую статью независимы. После отмены/публикации черновика ссылка возвращает 404.",
    responses:{...errors,200:response("Секретная ссылка",success({type:"object",required:["url","path"],properties:{url:{type:"string",format:"uri"},path:{type:"string"}}}))},
  }),
};
writeFileSync("openapi.yaml", JSON.stringify(spec, null, 2) + "\n");
writeFileSync(
  "src/lib/blog-openapi.json",
  JSON.stringify(spec, null, 2) + "\n",
);
