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
      <Field
        label="Пароль на QR"
        hint={passwordHint ?? "Пароль открывает страницу и файл. Прямая ссылка на хранилище для новых загрузок не работает."}
      >
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
        Подключите Яндекс Метрику или VK Пиксель для отслеживания переходов из QR-кода.
      </p>
      <Field label="Яндекс Метрика (номер счётчика)">
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

export function QrAdvancedSettingsBlock({
  showUrlExtras,
  expiry,
  trackingPixels,
  onTrackingPixelsChange,
}: {
  showUrlExtras: boolean;
  expiry: ExpiryProps;
  trackingPixels: TrackingPixels;
  onTrackingPixelsChange: (value: TrackingPixels) => void;
}) {
  return (
    <div style={{ marginTop: "24px" }}>
      <div className="qrs-wizard-section-label">Дополнительные настройки</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <QrExpiryAccordion {...expiry} />
        {showUrlExtras ? (
          <>
            <QrRetargetingAccordion trackingPixels={trackingPixels} onChange={onTrackingPixelsChange} />
          </>
        ) : null}
      </div>
    </div>
  );
}
