"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/client-api";
import { FaviconUpload } from "@/components/admin/favicon-upload";
import { Alert, Button, Field, Input } from "@/components/ui";

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
  initialContactEmail: string;
  initialContactPhone: string;
  initialRequisitesInn: string;
  initialRequisitesName: string;
};

export function SiteSettingsForm({
  initialYandexMetrikaId,
  initialCustomHeadCode,
  initialRobotsTxtContent,
  initialFaviconUrl,
  initialIndexNowKey,
  initialContactEmail,
  initialContactPhone,
  initialRequisitesInn,
  initialRequisitesName,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [yandexMetrikaId, setYandexMetrikaId] = useState(initialYandexMetrikaId);
  const [customHeadCode, setCustomHeadCode] = useState(initialCustomHeadCode);
  const [robotsTxtContent, setRobotsTxtContent] = useState(initialRobotsTxtContent);
  const [faviconUrl, setFaviconUrl] = useState(initialFaviconUrl);
  const [indexNowKey, setIndexNowKey] = useState(initialIndexNowKey);
  const [contactEmail, setContactEmail] = useState(initialContactEmail);
  const [contactPhone, setContactPhone] = useState(initialContactPhone);
  const [requisitesInn, setRequisitesInn] = useState(initialRequisitesInn);
  const [requisitesName, setRequisitesName] = useState(initialRequisitesName);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetchApi("/api/admin/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          yandexMetrikaId: yandexMetrikaId.trim() || null,
          customHeadCode: customHeadCode.trim() || null,
          robotsTxtContent: robotsTxtContent.trim() || null,
          faviconUrl: faviconUrl.trim() || null,
          indexNowKey: indexNowKey.trim() || null,
          contactEmail: contactEmail.trim() || null,
          contactPhone: contactPhone.trim() || null,
          requisitesInn: requisitesInn.trim() || null,
          requisitesName: requisitesName.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string })?.error ?? "Ошибка сохранения");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? (
        <Alert variant="danger" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Field label="ID счётчика Яндекс Метрики" htmlFor="yandexMetrikaId" hint="Числовой ID из личного кабинета. Оставьте пустым, чтобы отключить.">
        <Input
          id="yandexMetrikaId"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          className="max-w-xs"
          placeholder="Например: 12345678"
          value={yandexMetrikaId}
          onChange={(e) => setYandexMetrikaId(e.target.value)}
        />
      </Field>

      <Field label="robots.txt" htmlFor="robotsTxtContent" hint="Полный текст robots.txt. Пусто — дефолт (disallow /dashboard, /admin, sitemap).">
        <textarea
          id="robotsTxtContent"
          rows={10}
          className="fk-input font-mono text-sm"
          placeholder={"User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /admin\n\nSitemap: https://example.com/sitemap.xml"}
          value={robotsTxtContent}
          onChange={(e) => setRobotsTxtContent(e.target.value)}
        />
      </Field>

      <Field label="Дополнительный код в <head>" htmlFor="customHeadCode" hint="HTML-код для вставки в <head> на всех страницах.">
        <textarea
          id="customHeadCode"
          rows={8}
          className="fk-input font-mono text-sm"
          placeholder={'<meta name="custom" content="value" />\n<script src="..."></script>'}
          value={customHeadCode}
          onChange={(e) => setCustomHeadCode(e.target.value)}
        />
      </Field>

      <Field
        label="IndexNow (Яндекс, Bing)"
        htmlFor="indexNowKey"
        hint={
          <>
            Файл ключа: site.ru/{indexNowKey || "ключ"}.txt.{" "}
            <a href="https://yandex.ru/support/webmaster/ru/indexing-options/index-now" target="_blank" rel="noopener noreferrer" className="qrs-navlink">
              Документация
            </a>
          </>
        }
      >
        <div className="flex gap-2">
          <Input
            id="indexNowKey"
            type="text"
            className="flex-1 font-mono text-sm"
            placeholder="Ключ 8–128 символов (a-z, A-Z, 0-9, -)"
            value={indexNowKey}
            onChange={(e) => setIndexNowKey(e.target.value)}
          />
          <Button type="button" variant="secondary" className="shrink-0" onClick={() => setIndexNowKey(generateIndexNowKey())}>
            Сгенерировать
          </Button>
        </div>
      </Field>

      <Field label="Favicon" hint="Иконка сайта (ICO, PNG, WebP). До 512 КБ.">
        <FaviconUpload
          currentUrl={faviconUrl || undefined}
          onUploaded={(url) => {
            setFaviconUrl(url);
          }}
        />
      </Field>

      <div className="qrs-admin-form-section" style={{ marginTop: 8 }}>
        <h3 style={{ font: "var(--fw-bold) 1.1rem/1.2 var(--font-display)", color: "var(--text-strong)", marginBottom: 8 }}>
          Реквизиты и контакты
        </h3>
        <p style={{ marginBottom: 16, font: "var(--fw-regular) 14px/1.55 var(--font-sans)", color: "var(--text-muted)" }}>
          Эти данные отображаются в подвале сайта и юридических документах для модерации платежных систем.
        </p>

        <div className="space-y-4">
          <Field label="ФИО / Название организации" htmlFor="requisitesName">
            <Input
              id="requisitesName"
              type="text"
              placeholder="Например: Иванов Иван Иванович"
              value={requisitesName}
              onChange={(e) => setRequisitesName(e.target.value)}
            />
          </Field>

          <Field label="ИНН" htmlFor="requisitesInn">
            <Input
              id="requisitesInn"
              type="text"
              placeholder="Например: 123456789012"
              value={requisitesInn}
              onChange={(e) => setRequisitesInn(e.target.value)}
            />
          </Field>

          <Field label="Контактный Email" htmlFor="contactEmail">
            <Input
              id="contactEmail"
              type="email"
              placeholder="Например: contact@example.com"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </Field>

          <Field label="Контактный телефон" htmlFor="contactPhone">
            <Input
              id="contactPhone"
              type="text"
              placeholder="Например: +7 999 123-45-67"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </Field>
        </div>
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? "Сохранение…" : "Сохранить"}
      </Button>
    </form>
  );
}
