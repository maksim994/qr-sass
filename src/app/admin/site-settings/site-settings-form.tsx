"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/client-api";
import { FaviconUpload } from "@/components/admin/favicon-upload";

function generateIndexNowKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-";
  let key = "";
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

type Props = {
  initialYandexMetrikaId: string;
  initialCustomHeadCode: string;
  initialRobotsTxtContent: string;
  initialFaviconUrl: string;
  initialIndexNowKey: string;
};

export function SiteSettingsForm({
  initialYandexMetrikaId,
  initialCustomHeadCode,
  initialRobotsTxtContent,
  initialFaviconUrl,
  initialIndexNowKey,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [yandexMetrikaId, setYandexMetrikaId] = useState(initialYandexMetrikaId);
  const [customHeadCode, setCustomHeadCode] = useState(initialCustomHeadCode);
  const [robotsTxtContent, setRobotsTxtContent] = useState(initialRobotsTxtContent);
  const [faviconUrl, setFaviconUrl] = useState(initialFaviconUrl);
  const [indexNowKey, setIndexNowKey] = useState(initialIndexNowKey);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetchApi("/api/admin/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          yandexMetrikaId: yandexMetrikaId.trim() || null,
          customHeadCode: customHeadCode.trim() || null,
          robotsTxtContent: robotsTxtContent.trim() || null,
          faviconUrl: faviconUrl.trim() || null,
          indexNowKey: indexNowKey.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string })?.error ?? "Ошибка сохранения");
      }
      router.refresh();
    } catch (e) {
      alert((e instanceof Error ? e.message : "Не удалось сохранить") || "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="label" htmlFor="yandexMetrikaId">
          ID счётчика Яндекс Метрики
        </label>
        <input
          id="yandexMetrikaId"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className="input max-w-xs"
          placeholder="Например: 12345678"
          value={yandexMetrikaId}
          onChange={(e) => setYandexMetrikaId(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-500">
          Числовой ID из личного кабинета Яндекс Метрики. Оставьте пустым, чтобы отключить.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="robotsTxtContent">
          robots.txt
        </label>
        <textarea
          id="robotsTxtContent"
          rows={10}
          className="input font-mono text-sm"
          placeholder="User-agent: *&#10;Allow: /&#10;Disallow: /dashboard&#10;Disallow: /admin&#10;&#10;Sitemap: https://example.com/sitemap.xml"
          value={robotsTxtContent}
          onChange={(e) => setRobotsTxtContent(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-500">
          Полный текст robots.txt. Оставьте пустым — будет использован дефолт (disallow для /dashboard, /admin, ссылка на sitemap).
        </p>
      </div>

      <div>
        <label className="label" htmlFor="customHeadCode">
          Дополнительный код в &lt;head&gt;
        </label>
        <textarea
          id="customHeadCode"
          rows={8}
          className="input font-mono text-sm"
          placeholder={'<meta name="custom" content="value" />\n<script src="..."></script>'}
          value={customHeadCode}
          onChange={(e) => setCustomHeadCode(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-500">
          HTML-код, который будет вставлен в &lt;head&gt; на всех страницах. Например, скрипты счётчиков или мета-теги.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="indexNowKey">
          IndexNow (Яндекс, Bing)
        </label>
        <div className="flex gap-2">
          <input
            id="indexNowKey"
            type="text"
            className="input flex-1 font-mono text-sm"
            placeholder="Ключ 8–128 символов (a-z, A-Z, 0-9, -)"
            value={indexNowKey}
            onChange={(e) => setIndexNowKey(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-secondary shrink-0"
            onClick={() => setIndexNowKey(generateIndexNowKey())}
          >
            Сгенерировать
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Уведомление Яндекс и Bing об изменениях (новые/обновлённые посты блога). Файл ключа: site.ru/{indexNowKey || "ключ"}.txt.{" "}
          <a href="https://yandex.ru/support/webmaster/ru/indexing-options/index-now" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            Документация
          </a>
        </p>
      </div>

      <div>
        <label className="label">Favicon</label>
        <FaviconUpload
          currentUrl={faviconUrl || undefined}
          onUploaded={(url) => {
            setFaviconUrl(url);
          }}
        />
        <p className="mt-1 text-xs text-slate-500">
          Иконка сайта (favicon). Отображается во вкладке браузера. ICO, PNG, WebP.
        </p>
      </div>

      <button type="submit" disabled={saving} className="btn btn-primary">
        {saving ? "Сохранение…" : "Сохранить"}
      </button>
    </form>
  );
}
