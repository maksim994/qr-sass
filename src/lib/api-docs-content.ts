export type ApiDocsSection = {
  id: string;
  label: string;
  group?: string;
};

export type ApiEndpoint = {
  id: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  title: string;
  description: string;
  body?: string;
  response?: string;
};

export const apiDocsNav: ApiDocsSection[] = [
  { id: "authentication", label: "Аутентификация", group: "Начало работы" },
  { id: "base-url", label: "Базовый URL", group: "Начало работы" },
  { id: "list-qr", label: "Список QR-кодов", group: "QR-коды" },
  { id: "create-qr", label: "Создать QR-код", group: "QR-коды" },
  { id: "get-qr", label: "Детали QR-кода", group: "QR-коды" },
  { id: "update-qr", label: "Обновить QR-код", group: "QR-коды" },
  { id: "update-target", label: "Сменить URL", group: "QR-коды" },
  { id: "delete-qr", label: "Архивировать", group: "QR-коды" },
  { id: "download-qr", label: "Скачать PNG/SVG", group: "QR-коды" },
  { id: "curl-example", label: "Пример curl", group: "Примеры" },
];

export const apiDocsEndpoints: ApiEndpoint[] = [
  {
    id: "list-qr",
    method: "GET",
    path: "/api/qr?workspaceId=xxx",
    title: "Список QR-кодов",
    description: "Список QR-кодов рабочей области (до 100).",
    response: `// Ответ
{ "ok": true, "data": { "items": [{ "id", "name", "kind", "contentType", "shortCode", "_count": { "scanEvents" } }, ...] } }`,
  },
  {
    id: "create-qr",
    method: "POST",
    path: "/api/qr",
    title: "Создать QR-код",
    description: "Создание QR-кода.",
    body: `// Тело запроса
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
{ "ok": true, "data": { "qrId", "shortCode", "score" } }`,
  },
  {
    id: "get-qr",
    method: "GET",
    path: "/api/qr/[id]",
    title: "Детали QR-кода",
    description: "Детали QR-кода.",
  },
  {
    id: "update-qr",
    method: "PATCH",
    path: "/api/qr/[id]",
    title: "Обновить QR-код",
    description: "Обновление name, payload, style.",
  },
  {
    id: "update-target",
    method: "PATCH",
    path: "/api/qr/[id]/target",
    title: "Сменить URL",
    description: "Смена URL назначения для динамического QR.",
    body: `// Тело
{ "targetUrl": "https://example.com/new" }`,
  },
  {
    id: "delete-qr",
    method: "DELETE",
    path: "/api/qr/[id]",
    title: "Архивировать QR-код",
    description: "Архивирование QR-кода.",
  },
  {
    id: "download-qr",
    method: "GET",
    path: "/api/qr/[id]/download?format=png|svg",
    title: "Скачать PNG/SVG",
    description: "Скачать QR-код в PNG или SVG.",
  },
];

export const methodBadgeVariant: Record<ApiEndpoint["method"], "success" | "primary" | "warning" | "danger"> = {
  GET: "success",
  POST: "primary",
  PATCH: "warning",
  DELETE: "danger",
};
