import Link from "next/link";
import { publicOrigin } from "@/lib/public-url";
export function QrApiDocs() {
  const base = publicOrigin();
  const example = `curl '${base}/api/v1/qr' \\\n  -H 'Authorization: Bearer YOUR_QRS_API_KEY' \\\n  -H 'Content-Type: application/json' \\\n  --data '{"name":"Товар 123","targetUrl":"https://example.com/product/123","source":"bitrix_module"}'`;
  return <section className="qrs-api-docs-section">
    <h2 className="qrs-api-docs-section-title">QR API v1</h2>
    <p className="qrs-api-docs-text">Доступен на Бесплатном, Про и Бизнесе. Создание учитывает общий лимит кабинета: на Бесплатном — два динамических кода. Обычные коды со ссылкой, текстом, Wi-Fi и телефоном модуль Битрикса создаёт локально. Через этот API создаются динамические ссылки.</p>
    <p className="qrs-api-docs-text"><Link href="/dashboard/api-keys" className="qrs-navlink">Создайте ключ qrs_api_</Link> с нужными разрешениями. Полный ключ показывается один раз. Отправляйте его только с сервера в заголовке <code>Authorization: Bearer …</code>. Cookie и прежние ключи qre_/qrs_blog_ не принимаются.</p>
    <ul className="qrs-api-docs-list">
      <li><code>GET /api/v1/qr/key</code> — проверить ключ, тариф, scopes и лимиты.</li>
      <li><code>GET /api/v1/qr?limit=50&amp;offset=0</code> — список своих активных кодов; qr:read.</li>
      <li><code>POST /api/v1/qr</code> — создать динамическую ссылку; qr:write.</li>
      <li><code>GET /api/v1/qr/&#123;id&#125;</code> — получить код; qr:read.</li>
      <li><code>PATCH /api/v1/qr/&#123;id&#125;</code> — сменить targetUrl; qr:write. Напечатанный QR сохраняется.</li>
      <li><code>GET /api/v1/qr/&#123;id&#125;/image?format=svg&amp;size=600&amp;errorCorrectionLevel=H</code> — SVG/PNG; qr:read. Параметры foreground и background: #RRGGBB, символ # кодируйте как %23.</li>
      <li><code>GET /api/v1/qr/&#123;id&#125;/stats?from=2026-10-01&amp;to=2026-10-22</code> — открытия по дням и устройствам; stats:read. Даты включительно, UTC, максимум 366 дней.</li>
    </ul>
    <pre className="qrs-api-docs-pre"><code>{example}</code></pre>
    <p className="qrs-api-docs-text">JSON: <code>{'{"ok":true,"data":{…}}'}</code>; ошибка: <code>{'{"ok":false,"error":"…","code":"…"}'}</code>. Создание возвращает 201; 401 — неверный или отозванный ключ, 403 — scope или лимит тарифа, 404 — код не найден, 429 — 60 запросов в минуту на ключ (Retry-After). Ответы private, no-store. Изображения возвращаются как image/png или image/svg+xml.</p>
    <p className="qrs-api-docs-text">Для модуля передавайте source=bitrix_module. Ссылка на регистрацию: <Link href="/register?utm_source=bitrix_marketplace&amp;utm_medium=module_settings" className="qrs-navlink">регистрация из настроек модуля</Link>. <a href="/api/v1/openapi.json" className="qrs-navlink">Полная схема OpenAPI</a>.</p>
  </section>;
}
