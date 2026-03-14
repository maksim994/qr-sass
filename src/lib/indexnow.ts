/**
 * IndexNow — протокол для уведомления поисковых систем об изменениях на сайте.
 * Документация: https://yandex.ru/support/webmaster/ru/indexing-options/index-now
 */

const YANDEX_INDEXNOW = "https://yandex.com/indexnow";
const BING_INDEXNOW = "https://api.indexnow.org/indexnow";

export type IndexNowConfig = {
  host: string;
  key: string;
  keyLocation: string;
};

export function buildIndexNowConfig(key: string): IndexNowConfig | null {
  const base = (process.env.APP_URL ?? "https://qr-s.ru").replace(/\/$/, "");
  if (!key?.trim()) return null;
  return {
    host: new URL(base).hostname,
    key: key.trim(),
    keyLocation: `${base}/${key.trim()}.txt`,
  };
}

/**
 * Отправляет URL в Яндекс и Bing через IndexNow.
 * key — из SiteSettings.indexNowKey.
 */
export async function notifyIndexNow(urls: string[], key: string): Promise<void> {
  const config = buildIndexNowConfig(key);
  if (!config || urls.length === 0) return;

  const body = {
    host: config.host,
    key: config.key,
    keyLocation: config.keyLocation,
    urlList: urls.slice(0, 10_000),
  };

  const endpoints = [YANDEX_INDEXNOW, BING_INDEXNOW];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        console.warn(`IndexNow ${endpoint}: ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      console.warn(`IndexNow ${endpoint} failed:`, err);
    }
  }
}
