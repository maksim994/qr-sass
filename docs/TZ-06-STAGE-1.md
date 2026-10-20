# ТЗ-06 — этап 1, 20.10.2026

## Отчёт до правок (1.0)

База работы: `4306d79`, последняя рабочая копия ТЗ-04. Этапы 2–4 не начинаются до приёмки Максимом этапа 1. Тело статьи ТЗ-05 не публикуем.

**Причина read-only установлена на настоящей странице админки:** консоль Chrome возвращает `CKEditorError: license-key-lts-not-allowed`; DOM содержит `ck-read-only`, `contenteditable="false"`. Lockfile/node_modules: CKEditor 47.7.5, React wrapper 11.x, self-hosted npm, тип ключа GPL. Обёртка не передаёт disabled/isReadOnly. Ветка 47.7 является LTS и не доступна этому типу ключа: [официальное описание ошибки](https://ckeditor.com/docs/ckeditor5/latest/support/error-codes.html#error-license-key-lts-not-allowed). CDN, отсутствие ключа и trial здесь не причина. Редактор удаляем без покупки лицензий.

**Модель сейчас:** BlogPost.content — Text HTML; publishedAt — признак публикации и её дата; updatedAt меняется Prisma при любом update, включая просмотры/лайки. BlogPostContent санитайзит DOMPurify, строит H2-якоря и оборачивает таблицы. sanitizeBlogFields дополнительно применяет исторические SEO-исправления при чтении и записи. JSON-LD целиком ручной либо fallback Article. Sitemap и видимая дата используют updatedAt. Блок пробной печати зашит в BlogSeoIntro для одного slug. Figure не входит в старый whitelist и не создаёт отдельного пространства.

**Предложенная реализация:** markdown-it (CommonMark с таблицами/зачёркиванием и расширением task-list), sanitize-html (явный whitelist), Turndown + GFM только для добровольной конвертации. Один серверный renderer вызывается сайтом и защищённым preview endpoint. Исходный Markdown хранится как текст, результат при сохранении санитайзится и хранится отдельно; при чтении HTML санитайзится снова. Raw HTML в Markdown ограничен figure/img/figcaption. HTML-ветка сохраняет прежний алгоритм вывода; сохранение без изменений не переписывает HTML. Миграция только добавляет поля, contentUpdatedAt nullable с fallback на прежний updatedAt, без массового backfill. Счётчики перестают менять редакционные даты.

**Противоречие приёмки:** побайтное равенство всего HTTP HTML невозможно одновременно с новым BlogPosting/FAQPage, заменой даты и новой сборкой Next.js. Проверяем отдельно дословную сохранность content в БД и совместимость HTML тела; изменения JSON-LD/дат ожидаемы. Для старого FAQ в ручном JSON-LD сохраняем совместимость до добровольного переноса в поля. Полная статья и файлы body-ids.md / faq.json / fields.txt к запросу не приложены; проверяем синтетический эквивалент, точная приёмка ТЗ-05 остаётся после вставки Максимом.

## Результат

Код: `ef643d6` (основная реализация), `c30cabd` (пустой черновик/незаконченный FAQ не блокируют предпросмотр). Ветка `codex/tz06-markdown-stage1`. Документ с диагнозом — отдельный коммит `02e3139` до реализации.

### Реализация

- Новые статьи используют Markdown. GFM: таблицы, зачёркивание, task-list, списки, code, ссылки; ручные H2/H3-якоря и уникальные транслитерированные автоматические id. Таблицы используют существующую доступную область прокрутки. Внешние HTTP(S)-ссылки получают target/rel, query/UTM сохраняется.
- Один серверный renderer используется публичной страницей и `/api/admin/blog/preview`. На сохранении Markdown создаётся санитайзированный `renderedHtml`, на чтении исходник снова проходит безопасный рендер. Исходник остаётся исходником: примеры кода не уничтожаются. Raw HTML ограничен figure/img/figcaption; скрипты, обработчики, iframe/style, опасные схемы и прочие raw-теги не проходят.
- Старый renderer DOMPurify и его алгоритм H2 сохранены в серверной HTML-ветке. Код HTML в форме read-only. PATCH запрещает менять его без подтверждённой конвертации; сохранение без правок не нормализует исходник. Исторические SEO-исправления HTML на чтении сохранены. Для Markdown авторские поля и новый текст больше не подменяются историческими SEO-оверлеями.
- Конвертация только по кнопке: Markdown, два отрендеренных представления и построчный diff нормализованного HTML. Подтверждение переводит форму в Markdown, запись происходит по «Сохранить». Сервер сохраняет оригинал в `legacyHtml`, не принимает поддельную резервную копию от клиента. Она доступна при повторном открытии. Возврат в HTML через PATCH запрещён.
- FAQ — отдельные простые текстовые поля с сортировкой. Видимый блок и FAQPage используют одни данные; [[faq]] размещает блок, без маркера он добавляется в конец или заменяет старый раздел с заголовком «Частые вопросы»/FAQ. Это меняет только представление после явного заполнения полей, исходный HTML остаётся в БД.
- BlogPosting строится из H1/SEO/дат/автора/обложки. Ручная разметка дополняет граф, собственные Article/BlogPosting/FAQPage в ней исключены. Для прежних HTML-статей без FAQ-полей сохранён fallback вопросов из ручного FAQPage до добровольного переноса. Форма предлагает перенос; повторный вывод типов запрещён. JSON-LD сериализуется с защитой от закрытия script.
- `contentUpdatedAt` используется для видимой даты, sitemap и dateModified. Nullable legacy fallback сохраняет прежнюю дату без backfill. Просмотры и лайки обновляют только атомарные счётчики; no-op, пробелы, флаг/категория/время чтения и «Мелкая правка» дату не меняют. `firstPublishedAt` сохраняет первую публикацию даже после снятия и повторной публикации.
- Поле `showPrintSizeIntro` по умолчанию true. Сохраняется прежнее условие шаблона: блок существует только у статьи о размере печати, новые блоки в другие статьи не добавляются. Узкий `scripts/set-blog-print-intro.mjs --apply` меняет только этот флаг у нужного slug, без updatedAt/contentUpdatedAt/content.
- CKEditor, его React-обёртка, CSS, postinstall-копирование и Docker-шаг удалены. Сохранён прежний IndexNow после значимой правки/публикации. Административные endpoints по-прежнему требуют сессию администратора; токенов этапа 3 здесь нет. Slug уже публиковавшейся статьи закреплён, устаревшая форма получает 409.

### Локальные проверки

| Проверка | Результат |
|---|---|
| npm test | 221/221, в том числе 17 новых тестов редактора/санитайзинга/дат/JSON-LD/конвертации |
| npm run lint; TypeScript; Next production build | Прошли; проверен запуск standalone |
| Реальная PostgreSQL + HTTP API | `scripts/verify-blog-editor.mjs`: ok, отдельная синтетическая БД `qr_tz06_stage1`, не production |
| Пять HTML-примеров | Исходник дословно тот же после PATCH, даты те же, DOM HTML публичного тела совпадает с прежней веткой |
| Эквивалент контрольного материала | 10 H2 с требуемыми id, две таблицы с thead, семь внешних ссылок с неизменными UTM, шесть вопросов в h3, один BlogPosting и один FAQPage |
| Небезопасные вставки | Проверены script, onerror/onload, javascript/data, iframe/style/svg, опасные entity-схемы, закрытие JSON-LD script |
| Черновик, права, гонки | URL черновика 404, нет в sitemap; без сессии/обычный пользователь не проходят; устаревшая форма 409, slug опубликованной статьи 403, неверный JSON-LD 400 |
| Даты | No-op/пробелы/minor/счётчики не меняют; существенная правка меняет dateModified и sitemap одинаково; первая публикация сохранена |
| Конвертация | Preview endpoint не пишет в БД; подтверждённый PATCH сохраняет original HTML; подмена legacyHtml отклоняется |
| Браузер | Предпросмотр меняется при вводе; исходник 620 px на 1440 px и 360 px на мобильном; scrollWidth=viewport на 360/1440; таблицы публичной страницы на 360 px заканчиваются на x=344, пустых слотов нет |
| UI-проверка impeccable | Detector: []; отдельная финальная проверка: материальных дефектов нет. FAQ/конвертация оценены по исходникам и HTTP-тестам, не по скриншотам этих состояний |
| CKEditor в новой сборке | Поиск ckeditor/licenseKey/ck-read-only в клиентских chunks пуст |

### Проверки восстановленной production-копии

Свежая штатная копия от 20.10.2026 07:02:56 UTC / 10:02:56 МСК: snapshot `8e9378b820e3674f72b239eeb83694d052f951bd1d7d6ec88db10aef198dac64`. Восстановление в 07:03:01 UTC проверило 190 файлов, 37 QR и 7 пользователей.

Закрытый серверный каталог `/var/lib/qr-s-release/20261020-tz06` (0700; снимки 0600) содержит dump, baseline v2 QR, отпечатки клиентских данных, исходный HTML пяти страниц, sitemap, mounts и окружение. Образ отката `qr-s-tz06-rollback:20261020`, прежняя production-ревизия `cf4477a`.

Кандидат работает в Docker-сети `--internal` с отдельным PostgreSQL на tmpfs, без production-томов, credentials платежей/SMTP/S3 и фоновых workers. Штатный migrate deploy применил только добавочную миграцию. Сравнение подтвердило 37 QR, 7 пользователей, 7 кабинетов, 5 подписок, 13 платежей, 3 файла, 10 прежних HTTP-контрактов. Все 44 исходные записи BlogPost сохранены, выбранные пять HTML-тел с inline-figure побайтно совпали после сериализации DOM, все 64 прежних URL sitemap сохранились. Автоконвертаций нет.

### Production

Выложена ревизия **c30cabd2df0181fd01dc0147ec465811624bc7dd** через прежний ресурс Coolify `o08skcsckso0o4o8o88ow08s`, ветка `codex/tz06-markdown-stage1`, pin на этот commit. Новое приложение запущено **20.10.2026 07:23:33 UTC / 10:23:33 МСК**. Образ `sha256:194fd2f283f867d8fdea0590fd5db1b71ce2ca123ad1c22bbd689ca75b3c6104`, health **healthy**, init-db exit **0**.

Первая попытка `85ix715dojmefjqjgkfjudyj` остановилась на `apk add libc6-compat` до переключения, production не менялся. Отдельная установка пакета в одноразовом официальном node:22-alpine прошла. Повторный штатный Deploy без изменения кода: [lweunmr9sid5cuaqmyvm5uy0](https://mv-deploy.ru/project/n0swg40cs8gwkoogkc448k0g/environment/gok40w8osk84kccog4ksc0kg/application/o08skcsckso0o4o8o88ow08s/deployment/lweunmr9sid5cuaqmyvm5uy0) — **Success**.

После выкладки относительно исходного baseline до релиза:

- QR compare: **OK**, прежние 37 QR без изменений.
- Клиентские данные: **ok=true**, 7 пользователей, 7 кабинетов, 5 подписок, 13 платежей, 3 файла, 10 HTTP-контрактов, failures=[].
- Блог: **ok=true**, все 44 прежние записи и исходники сохранены; пять HTML-тел с inline-figure совпали, все 64 адреса sitemap на месте, failures=[]. Все прежние статьи format=html.
- Mounts PostgreSQL/Redis побайтно совпали. Окружение совпало, кроме ожидаемых SOURCE_COMMIT, COOLIFY_BRANCH, COOLIFY_CONTAINER_NAME; unexpected=[]. Значения секретов не выводились.
- Узкий скрипт отключил **только** showPrintSizeIntro у razmer-qr-koda-dlya-pechati, datesUnchanged=true. На публичной странице #print-size-title отсутствует, dateModified остаётся `2026-10-20T06:03:43.221Z`.
- Открыта настоящая форма в новой вкладке Chrome под прежней сессией владельца. Предпросмотр HTML работает, исходник read-only, подготовка конвертации показывает Markdown и подтверждение; проверка отменена без сохранения. В новой форме Markdown проверен живой ввод и незаполненный FAQ без ошибок; ни одна тестовая статья в production не создана.
- [Внешний schema.org validator](https://validator.schema.org/#url=https%3A%2F%2Fqr-s.ru%2Fblog%2Frazmer-qr-koda-dlya-pechati): **нет ошибок и предупреждений**. В HTML ровно один BlogPosting и один FAQPage. Legacy FAQ сейчас содержит 5 ручных вопросов, тогда как тело — 6; это прежнее расхождение, оставленное до ручного переноса. После вставки ТЗ-05 нужно заполнить все 6 FAQ полями; синтетический тест уже проверяет их совпадение с JSON-LD.
- Production на 360 px: client/scroll width **360/360**, правая граница таблицы **344 px**, printIntro=0. Скриншоты редактора, мобильной страницы и валидатора сохранены локально в outputs/tz06-stage1 (вне Git).

Наблюдение `/api/health`: 341 запрос с 07:12:16 до 07:24:15 UTC; 5 неуспешных в одном окне переключения (timeout/503). Последний 200 перед ним — 07:23:22.752, первый 200 после — 07:23:40.235. Интервал между успешными пробами около 17.5 с; бесшовное обновление не заявляется. После переключения до конца наблюдения HTTP 200.

Тестовые контейнеры кандидатов и отдельная тестовая БД/сеть остановлены и удалены; production-тома не трогались. Проверенный backup, закрытые baseline/сравнения и образ отката сохранены. Локальный синтетический сервер и PostgreSQL также остановлены. После очистки production health — HTTP 200.

### Список изменённых файлов

| Область | Файлы |
|---|---|
| Схема | prisma/schema.prisma; prisma/migrations/20261020070000_blog_markdown/migration.sql |
| Renderer и данные | src/lib/blog-render.ts, blog-editor.ts, blog-faq.ts, blog-convert.ts, blog-indexnow.ts, blog-structured-data.ts; src/types/blog-modules.d.ts; src/lib/user-messages.ts |
| Админка | src/app/admin/blog/blog-post-form.tsx; src/app/admin/blog/[id]/edit/page.tsx; src/components/admin/markdown-editor.tsx и .module.css |
| Admin API | src/app/api/admin/blog/route.ts; [id]/route.ts; preview/route.ts; [id]/convert/route.ts |
| Публичный блог | src/app/blog/[slug]/page.tsx; src/components/blog/blog-post-content.tsx, blog-seo-intro.tsx; src/app/sitemap.ts; src/app/api/blog/[slug]/view/route.ts и like/route.ts; src/app/globals.css |
| Сборка | Dockerfile; package.json; package-lock.json |
| Проверки и операционные скрипты | src/lib/blog-editor.test.ts; scripts/verify-blog-editor.mjs, verify-blog-release.mjs, set-blog-print-intro.mjs |
| Удалены | src/components/admin/ckeditor-editor-client.tsx, rich-text-editor.tsx; public/ckeditor5.css; scripts/copy-ckeditor-css.mjs |
| Отчёт | docs/TZ-06-STAGE-1.md |

### Граница этапа и материалы для Максима

Полное HTTP HTML Next.js с новыми chunks/JSON-LD не обещается побайтно одинаковым; сохранность исходных записей и HTML тел проверена отдельно.

Контрольные body-ids.md, faq.json, fields.txt и сама новая статья не приложены. Синтетический эквивалент проверяет механику, но не заменяет приёмку конкретного текста ТЗ-05. Максим после этапа 1 подтверждает конвертацию нужной статьи, вставляет готовое тело и FAQ, SEO-поля и проверяет предпросмотр. Код статьи ТЗ-05 сам не публикует. Следующий этап начинается только после приёмки этого, как требует исходное ТЗ.
