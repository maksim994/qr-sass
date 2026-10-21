/** Explicit HTTPS origins from Yandex's CSP/iframe documentation, checked 2026-10-21.
 * https://yandex.ru/support/metrica/ru/code/install-counter-csp
 * https://yandex.ru/support/metrica/ru/behavior/link-map#about-iframe
 * Never replace this list with *.yandex.ru (which would trust unrelated services).
 */
export const METRIKA_FRAME_ORIGINS = [
  "https://metrika.yandex.ru",
  "https://analytics.yandex.by", "https://analytics.yandex.com", "https://analytics.yandex.com.tr", "https://analytics.yandex.kz", "https://analytics.yandex.ru",
  "https://metr.yandex.by", "https://metr.yandex.com", "https://metr.yandex.com.tr", "https://metr.yandex.kz", "https://metr.yandex.ru",
  "https://metrica.ya.ru", "https://metrica.yandex", "https://metrica.yandex.by", "https://metrica.yandex.com", "https://metrica.yandex.com.tr", "https://metrica.yandex.kz", "https://metrica.yandex.ru",
  "https://metrika.ya.ru", "https://metrika.yandex", "https://metrika.yandex.by", "https://metrika.yandex.com", "https://metrika.yandex.com.tr", "https://metrika.yandex.kz", "https://metrika.yandex.uz",
  "https://webvisor.com", "https://*.webvisor.com",
] as const;
export const PRIVATE_FRAME_ANCESTORS = "frame-ancestors 'self'";
export const PUBLIC_FRAME_ANCESTORS = `${PRIVATE_FRAME_ANCESTORS} ${METRIKA_FRAME_ORIGINS.join(" ")}`;
export const PRIVATE_FRAME_PATHS = ["/dashboard", "/admin", "/api", "/login", "/register", "/forgot-password", "/reset-password", "/preview", "/mini", "/r", "/p", "/v", "/g"];
export function isPrivateFramePath(path: string) {
  return PRIVATE_FRAME_PATHS.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}
