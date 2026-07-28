"use client";

import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { QrContentForm } from "@/components/qr-forms";
import { QrDesigner, type QrStyle } from "@/components/qr-designer";
import { BusinessLanding } from "@/components/landing-templates/business-landing";
import { getQrTypeInfo } from "@/lib/qr-types";
import { useQrStylingPreview } from "@/hooks/use-qr-styling-preview";
import { getQrPreviewData } from "@/lib/qr-preview-data";
import { QrContentType } from "@prisma/client";
import { parseStyleConfig } from "@/lib/qr-style-config";
import { Field, Input, Button } from "@/components/ui";
import { QrAdvancedSettingsBlock } from "@/components/qr/qr-advanced-settings";
import {
  getQrWizardSubtitle,
  QrWizardPageHead,
  QrWizardPreview,
  QrWizardTabs,
} from "@/components/qr/qr-wizard-shared";

function toDateTimeLocalValue(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type QrData = {
  id: string;
  name: string;
  kind: "STATIC" | "DYNAMIC";
  contentType: QrContentType;
  payload: Record<string, unknown>;
  styleConfig: Record<string, unknown>;
  shortCode: string | null;
  expireAt: string | null;
  maxScans: number | null;
  hasPassword: boolean;
};

export function EditQrClient({ workspaceId, initialQr }: { workspaceId: string; initialQr: QrData }) {
  const router = useRouter();
  const typeInfo = getQrTypeInfo(initialQr.contentType);
  const initialPayload = initialQr.payload;

  const [name, setName] = useState(initialQr.name);
  const [payload, setPayload] = useState<Record<string, unknown>>(initialPayload);
  const [style, setStyle] = useState<QrStyle>(() => parseStyleConfig(initialQr.styleConfig));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"content" | "design">("content");

  const [expireAt, setExpireAt] = useState(toDateTimeLocalValue(initialQr.expireAt));
  const [maxScans, setMaxScans] = useState(initialQr.maxScans != null ? String(initialQr.maxScans) : "");
  const [password, setPassword] = useState("");
  const [hasPassword, setHasPassword] = useState(initialQr.hasPassword);
  const [gdprRequired, setGdprRequired] = useState(initialPayload.gdprRequired === true);
  const [gdprPolicyUrl, setGdprPolicyUrl] = useState(String(initialPayload.gdprPolicyUrl ?? ""));
  const [smartRedirect, setSmartRedirect] = useState<{
    default?: string;
    ios?: string;
    android?: string;
    desktop?: string;
  }>(() => (initialPayload.smartRedirect as {
    default?: string;
    ios?: string;
    android?: string;
    desktop?: string;
  }) ?? {});
  const [trackingPixels, setTrackingPixels] = useState<{
    metaPixelId?: string;
    ga4Id?: string;
    gtmId?: string;
    ymCounterId?: string;
    vkPixelId?: string;
  }>(() => (initialPayload.trackingPixels as {
    metaPixelId?: string;
    ga4Id?: string;
    gtmId?: string;
    ymCounterId?: string;
    vkPixelId?: string;
  }) ?? {});
  const [abTest, setAbTest] = useState<{ urlA?: string; urlB?: string }>(
    () => (initialPayload.abTest as { urlA?: string; urlB?: string }) ?? {},
  );

  const previewData = useMemo(() => {
    const appUrl = typeof window !== "undefined" ? window.location.origin : "https://example.com";
    return getQrPreviewData(initialQr.contentType, payload, {
      appUrl,
      shortCode: initialQr.shortCode,
      kind: initialQr.kind,
    });
  }, [initialQr.contentType, initialQr.kind, initialQr.shortCode, payload]);

  const qrRef = useQrStylingPreview(previewData, style);
  const isDynamic = initialQr.kind === "DYNAMIC" || !!typeInfo?.needsHostedPage;

  const shortLink = initialQr.shortCode
    ? initialQr.kind === "DYNAMIC" && !typeInfo?.needsHostedPage
      ? `/r/${initialQr.shortCode}`
      : `/p/${initialQr.shortCode}`
    : null;

  async function handleSave() {
    setSaving(true);
    setError("");

    const mergedPayload = { ...payload };
    if (isDynamic) {
      mergedPayload.gdprRequired = gdprRequired;
      if (gdprPolicyUrl.trim()) mergedPayload.gdprPolicyUrl = gdprPolicyUrl.trim();
      else delete mergedPayload.gdprPolicyUrl;

      if (initialQr.contentType === "URL" && !typeInfo?.needsHostedPage) {
        const sr: Record<string, string> = {};
        if (smartRedirect.default?.trim()) sr.default = smartRedirect.default.trim();
        if (smartRedirect.ios?.trim()) sr.ios = smartRedirect.ios.trim();
        if (smartRedirect.android?.trim()) sr.android = smartRedirect.android.trim();
        if (smartRedirect.desktop?.trim()) sr.desktop = smartRedirect.desktop.trim();
        if (Object.keys(sr).length) mergedPayload.smartRedirect = sr;
        else delete mergedPayload.smartRedirect;

        const tp: Record<string, string> = {};
        if (trackingPixels.metaPixelId?.trim()) tp.metaPixelId = trackingPixels.metaPixelId.trim();
        if (trackingPixels.ga4Id?.trim()) tp.ga4Id = trackingPixels.ga4Id.trim();
        if (trackingPixels.gtmId?.trim()) tp.gtmId = trackingPixels.gtmId.trim();
        if (trackingPixels.ymCounterId?.trim()) tp.ymCounterId = trackingPixels.ymCounterId.trim();
        if (trackingPixels.vkPixelId?.trim()) tp.vkPixelId = trackingPixels.vkPixelId.trim();
        if (Object.keys(tp).length) mergedPayload.trackingPixels = tp;
        else delete mergedPayload.trackingPixels;

        const ab: Record<string, string> = {};
        if (abTest.urlA?.trim()) ab.urlA = abTest.urlA.trim();
        if (abTest.urlB?.trim()) ab.urlB = abTest.urlB.trim();
        if (Object.keys(ab).length === 2) mergedPayload.abTest = ab;
        else delete mergedPayload.abTest;
      }
    }

    const body: Record<string, unknown> = { name, payload: mergedPayload, style };
    if (initialQr.kind === "DYNAMIC") {
      body.expireAt = expireAt.trim() ? new Date(expireAt).toISOString() : null;
      if (maxScans.trim()) {
        const n = parseInt(maxScans, 10);
        body.maxScans = Number.isInteger(n) && n >= 1 ? n : null;
      } else {
        body.maxScans = null;
      }
      if (password.trim()) body.password = password.trim();
    }

    const response = await fetchApi(`/api/qr/${initialQr.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const parsed = await parseApiResponse<{ updated?: boolean }>(response);
    setSaving(false);

    if (!parsed.ok) {
      setError(parsed.error ?? "Не удалось сохранить изменения.");
      return;
    }

    if (password.trim()) {
      setHasPassword(true);
      setPassword("");
    }

    router.push(`/dashboard/qr/${initialQr.id}`);
    router.refresh();
  }

  if (!typeInfo) {
    return (
      <div style={{ maxWidth: "480px", margin: "80px auto", textAlign: "center" }}>
        <p style={{ font: "var(--fw-semibold) 18px/1.3 var(--font-display)", color: "var(--text-strong)" }}>
          Тип QR-кода не поддерживается
        </p>
        <Button href={`/dashboard/qr/${initialQr.id}`} className="mt-4">
          Назад
        </Button>
      </div>
    );
  }

  return (
    <div className="qrs-dash-main-inner">
      <QrWizardPageHead
        backHref={`/dashboard/qr/${initialQr.id}`}
        contentType={initialQr.contentType}
        title={typeInfo.description}
        subtitle={`${getQrWizardSubtitle(initialQr.contentType, typeInfo.label)} · Редактирование`}
        kindControl={
          <span className="fk-badge fk-badge--primary">
            {initialQr.kind === "DYNAMIC" ? "Динамический" : "Статический"}
          </span>
        }
      />

      <div className="qrs-build-grid">
        <div>
          <div style={{ marginBottom: "22px" }}>
            <Field label="Название">
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: Меню ресторана"
              />
            </Field>
          </div>

          <QrWizardTabs value={activeTab} onChange={setActiveTab} />

          {activeTab === "content" ? (
            <div className="qrs-wizard-card">
              <QrContentForm
                type={initialQr.contentType}
                payload={payload}
                onChange={setPayload}
                workspaceId={workspaceId}
              />
            </div>
          ) : (
            <QrDesigner style={style} onChange={setStyle} workspaceId={workspaceId} />
          )}

          {isDynamic ? (
            <QrAdvancedSettingsBlock
              showUrlExtras={initialQr.contentType === "URL" && !typeInfo.needsHostedPage}
              expiry={{
                expireAt,
                onExpireAtChange: setExpireAt,
                maxScans,
                onMaxScansChange: setMaxScans,
                password,
                onPasswordChange: setPassword,
                passwordHint: hasPassword ? "Пароль уже установлен. Введите новый, чтобы заменить." : undefined,
                gdprRequired,
                onGdprRequiredChange: setGdprRequired,
                gdprPolicyUrl,
                onGdprPolicyUrlChange: setGdprPolicyUrl,
              }}
              trackingPixels={trackingPixels}
              onTrackingPixelsChange={setTrackingPixels}
              abTest={abTest}
              onAbTestChange={setAbTest}
            />
          ) : null}
        </div>

        <QrWizardPreview
          kindLabel={initialQr.kind === "DYNAMIC" ? "Динамический" : "Статический"}
          qrRef={qrRef}
          hostedPreview={initialQr.contentType === "BUSINESS" ? <BusinessLanding payload={payload} /> : undefined}
          saveLabel="Сохранить изменения"
          saving={saving}
          onSave={handleSave}
          error={error}
          shortLink={shortLink}
          previewData={previewData}
          style={style}
        />
      </div>
    </div>
  );
}
