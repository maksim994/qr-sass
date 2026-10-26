export function moderationRestricted(status?: string | null, holdUntilCheck = false) { return status === 'ON_MODERATION' || status === 'BLOCKED' || status === 'PENDING_CHECK' && holdUntilCheck; }
export function moderationResponse(status: string | null | undefined, code: string, holdUntilCheck = false): Response | null {
  if (!moderationRestricted(status, holdUntilCheck)) return null;
  const safe = encodeURIComponent(code);
  const text = status === 'BLOCKED' ? 'Ссылка заблокирована за нарушение правил сервиса' : 'Ссылка временно на проверке. Попробуйте открыть позже';
  return new Response(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${text}</title></head><body><main><h1>${text}</h1><p><a href="/report/${safe}">Пожаловаться</a></p><p><a href="mailto:abuse@qr-s.ru">abuse@qr-s.ru</a></p></main></body></html>`, { status: status === 'BLOCKED' ? 451 : 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; base-uri 'none'; frame-ancestors 'none'" } });
}
