import Link from "next/link";

export default function ApiDocsPage() {
  const baseUrl = process.env.APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Документация API</h1>
        <p className="mt-1 text-sm text-slate-500">
          REST API для управления QR-кодами. Доступно на тарифе Бизнес.
        </p>
      </div>

      <div className="prose prose-slate max-w-none space-y-10">
        <section>
          <h2 className="text-lg font-semibold text-slate-900">Аутентификация</h2>
          <p className="text-sm text-slate-600">
            API поддерживает два способа аутентификации:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6 text-sm text-slate-600">
            <li>
              <strong>Сессия (cookie)</strong> — при работе из браузера, будучи залогиненным
            </li>
            <li>
              <strong>API-ключ</strong> — заголовок <code className="rounded bg-slate-100 px-1">Authorization: Bearer qre_xxxxxxxx</code>
            </li>
          </ul>
          <p className="mt-2 text-sm text-slate-600">
            API-ключи создаются в <Link href="/dashboard/api-keys" className="font-medium text-blue-600 hover:text-blue-700">разделе API-ключи</Link>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Базовый URL</h2>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-100 p-4 text-sm">
            {baseUrl}/api
          </pre>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Методы</h2>

          <div className="space-y-6">
            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">GET</span>
                <code className="text-sm">/api/qr?workspaceId=xxx</code>
              </div>
              <p className="mt-2 text-sm text-slate-600">Список QR-кодов рабочей области (до 100).</p>
              <pre className="mt-2 overflow-x-auto rounded bg-slate-50 p-3 text-xs text-slate-600">
{`// Ответ
{ "ok": true, "data": { "items": [{ "id", "name", "kind", "contentType", "shortCode", "_count": { "scanEvents" } }, ...] } }`}
              </pre>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">POST</span>
                <code className="text-sm">/api/qr</code>
              </div>
              <p className="mt-2 text-sm text-slate-600">Создание QR-кода.</p>
              <pre className="mt-2 overflow-x-auto rounded bg-slate-50 p-3 text-xs text-slate-600">
{`// Тело запроса
{
  "workspaceId": "xxx",
  "projectId": "xxx",  // опционально
  "name": "Мой QR",
  "kind": "STATIC" | "DYNAMIC",
  "contentType": "URL" | "TEXT" | "EMAIL" | "PHONE" | "WIFI" | "VCARD" | ...,
  "payload": { "url": "https://..." },  // зависит от contentType
  "style": {
    "dotColor": "#111111",
    "bgColor": "#ffffff",
    "margin": 2,
    "errorCorrectionLevel": "M"
  }
}

// Ответ
{ "ok": true, "data": { "qrId", "shortCode", "score" } }`}
              </pre>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">GET</span>
                <code className="text-sm">/api/qr/[id]</code>
              </div>
              <p className="mt-2 text-sm text-slate-600">Детали QR-кода.</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">PATCH</span>
                <code className="text-sm">/api/qr/[id]</code>
              </div>
              <p className="mt-2 text-sm text-slate-600">Обновление name, payload, style.</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">PATCH</span>
                <code className="text-sm">/api/qr/[id]/target</code>
              </div>
              <p className="mt-2 text-sm text-slate-600">Смена URL назначения для динамического QR.</p>
              <pre className="mt-2 overflow-x-auto rounded bg-slate-50 p-3 text-xs text-slate-600">
{`// Тело
{ "targetUrl": "https://example.com/new" }`}
              </pre>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">DELETE</span>
                <code className="text-sm">/api/qr/[id]</code>
              </div>
              <p className="mt-2 text-sm text-slate-600">Архивирование QR-кода.</p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">GET</span>
                <code className="text-sm">/api/qr/[id]/download?format=png|svg</code>
              </div>
              <p className="mt-2 text-sm text-slate-600">Скачать QR-код в PNG или SVG.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900">Пример (curl)</h2>
          <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-100 p-4 text-sm">
{`curl -X POST ${baseUrl}/api/qr \\
  -H "Authorization: Bearer qre_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "workspaceId": "your_workspace_id",
    "name": "Тест",
    "kind": "STATIC",
    "contentType": "URL",
    "payload": { "url": "https://example.com" },
    "style": {}
  }'`}
          </pre>
        </section>
      </div>
    </div>
  );
}
