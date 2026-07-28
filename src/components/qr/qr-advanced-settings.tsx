"use client";

import type { ReactNode } from "react";
import { Field, Input } from "@/components/ui";
import { QrAdvancedAccordion } from "./qr-wizard-shared";

const iconClock = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const iconRetarget = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

const iconAb = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 3v18h18" />
    <path d="m7 14 4-4 3 3 5-6" />
  </svg>
);

type ExpiryProps = {
  expireAt: string;
  onExpireAtChange: (value: string) => void;
  maxScans: string;
  onMaxScansChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  passwordHint?: ReactNode;
  gdprRequired: boolean;
  onGdprRequiredChange: (value: boolean) => void;
  gdprPolicyUrl: string;
  onGdprPolicyUrlChange: (value: string) => void;
  minExpireAt?: string;
};

export function QrExpiryAccordion({
  expireAt,
  onExpireAtChange,
  maxScans,
  onMaxScansChange,
  password,
  onPasswordChange,
  passwordHint,
  gdprRequired,
  onGdprRequiredChange,
  gdprPolicyUrl,
  onGdprPolicyUrlChange,
  minExpireAt,
}: ExpiryProps) {
  return (
    <QrAdvancedAccordion title="Срок действия" icon={iconClock} defaultOpen>
      <Field label="Действует до" hint="Оставьте пустым, если срок не ограничен.">
        <Input
          type="datetime-local"
          value={expireAt}
          onChange={(e) => onExpireAtChange(e.target.value)}
          min={minExpireAt}
        />
      </Field>
      <Field label="Максимум сканов">
        <Input
          type="number"
          min={1}
          value={maxScans}
          onChange={(e) => onMaxScansChange(e.target.value)}
          placeholder="Без лимита"
        />
      </Field>
      <Field label="Пароль на QR" hint={passwordHint}>
        <Input
          type="password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder="Оставьте пустым, если пароль не нужен"
          autoComplete="new-password"
        />
      </Field>
      <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={gdprRequired}
          onChange={(e) => onGdprRequiredChange(e.target.checked)}
          style={{ width: "18px", height: "18px", accentColor: "var(--color-primary)" }}
        />
        <span style={{ font: "var(--fw-medium) 14px/1 var(--font-sans)", color: "var(--text-default)" }}>
          Требуется согласие GDPR
        </span>
      </label>
      {gdprRequired ? (
        <Field label="URL политики конфиденциальности">
          <Input
            type="url"
            value={gdprPolicyUrl}
            onChange={(e) => onGdprPolicyUrlChange(e.target.value)}
            placeholder="https://example.com/privacy"
          />
        </Field>
      ) : null}
    </QrAdvancedAccordion>
  );
}

type TrackingPixels = {
  metaPixelId?: string;
  ga4Id?: string;
  gtmId?: string;
  ymCounterId?: string;
  vkPixelId?: string;
};

export function QrRetargetingAccordion({
  trackingPixels,
  onChange,
}: {
  trackingPixels: TrackingPixels;
  onChange: (value: TrackingPixels) => void;
}) {
  return (
    <QrAdvancedAccordion title="Ретаргетинг" icon={iconRetarget}>
      <p style={{ margin: 0, font: "var(--fw-regular) 13px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
        Добавьте пиксели на страницу редиректа, чтобы собирать аудиторию для рекламы.
      </p>
      <Field label="Meta Pixel ID">
        <Input
          type="text"
          value={trackingPixels.metaPixelId ?? ""}
          onChange={(e) => onChange({ ...trackingPixels, metaPixelId: e.target.value })}
          placeholder="000000000000000"
        />
      </Field>
      <Field label="GA4 Measurement ID">
        <Input
          type="text"
          value={trackingPixels.ga4Id ?? ""}
          onChange={(e) => onChange({ ...trackingPixels, ga4Id: e.target.value })}
          placeholder="G-XXXXXXXXXX"
        />
      </Field>
      <Field label="Google Tag Manager ID">
        <Input
          type="text"
          value={trackingPixels.gtmId ?? ""}
          onChange={(e) => onChange({ ...trackingPixels, gtmId: e.target.value })}
          placeholder="GTM-XXXXXXX"
        />
      </Field>
      <Field label="Яндекс Метрика / VK Пиксель">
        <Input
          type="text"
          value={trackingPixels.ymCounterId ?? ""}
          onChange={(e) => onChange({ ...trackingPixels, ymCounterId: e.target.value })}
          placeholder="Номер счётчика"
        />
      </Field>
      <Field label="VK Пиксель (ID)">
        <Input
          type="text"
          value={trackingPixels.vkPixelId ?? ""}
          onChange={(e) => onChange({ ...trackingPixels, vkPixelId: e.target.value })}
          placeholder="VK-RTRG-XXXXX"
        />
      </Field>
    </QrAdvancedAccordion>
  );
}

export function QrAbTestAccordion({
  abTest,
  onChange,
}: {
  abTest: { urlA?: string; urlB?: string };
  onChange: (value: { urlA?: string; urlB?: string }) => void;
}) {
  return (
    <QrAdvancedAccordion title="A/B-тестирование" icon={iconAb}>
      <p style={{ margin: 0, font: "var(--fw-regular) 13px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
        Разделите трафик между двумя URL и сравните конверсию.
      </p>
      <Field label="Вариант A — 50%">
        <Input
          type="url"
          value={abTest.urlA ?? ""}
          onChange={(e) => onChange({ ...abTest, urlA: e.target.value })}
          placeholder="https://example.com/a"
        />
      </Field>
      <Field label="Вариант B — 50%">
        <Input
          type="url"
          value={abTest.urlB ?? ""}
          onChange={(e) => onChange({ ...abTest, urlB: e.target.value })}
          placeholder="https://example.com/b"
        />
      </Field>
    </QrAdvancedAccordion>
  );
}

export function QrAdvancedSettingsBlock({
  showUrlExtras,
  expiry,
  trackingPixels,
  onTrackingPixelsChange,
  abTest,
  onAbTestChange,
}: {
  showUrlExtras: boolean;
  expiry: ExpiryProps;
  trackingPixels: TrackingPixels;
  onTrackingPixelsChange: (value: TrackingPixels) => void;
  abTest: { urlA?: string; urlB?: string };
  onAbTestChange: (value: { urlA?: string; urlB?: string }) => void;
}) {
  return (
    <div style={{ marginTop: "24px" }}>
      <div className="qrs-wizard-section-label">Дополнительные настройки</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <QrExpiryAccordion {...expiry} />
        {showUrlExtras ? (
          <>
            <QrRetargetingAccordion trackingPixels={trackingPixels} onChange={onTrackingPixelsChange} />
            <QrAbTestAccordion abTest={abTest} onChange={onAbTestChange} />
          </>
        ) : null}
      </div>
    </div>
  );
}
