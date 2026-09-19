"use client";

import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { QrContentForm } from "@/components/qr-forms";
import { QrDesigner, type QrStyle } from "@/components/qr-designer";
import { BusinessLanding } from "@/components/landing-templates/business-landing";
import { getQrTypeInfo } from "@/lib/qr-types";
import { useQrStylingPreview } from "@/hooks/use-qr-styling-preview";
import { canonicalQrData } from "@/lib/qr-canonical";
import { evaluateScannability, styleToScannability } from "@/lib/scannability";
import { qrPublicPath } from "@/lib/safe-redirect";
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
import { QrLifetimeNote } from "@/components/qr/qr-lifetime-note";
import { MSG } from "@/lib/user-messages";
import { savedQrIdForDownload } from "@/lib/qr-download-gate";

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
  const savePending = useRef(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"content" | "design">("content");
  const contentPanelId = useId();
  const designPanelId = useId();

  const [expireAt, setExpireAt] = useState(toDateTimeLocalValue(initialQr.expireAt));
  const [maxScans, setMaxScans] = useState(initialQr.maxScans != null ? String(initialQr.maxScans) : "");
  const [password, setPassword] = useState("");
  const [hasPassword, setHasPassword] = useState(initialQr.hasPassword);
  const [gdprRequired, setGdprRequired] = useState(initialPayload.gdprRequired === true);
  const [gdprPolicyUrl, setGdprPolicyUrl] = useState(String(initialPayload.gdprPolicyUrl ?? ""));
  const [smartRedirect] = useState<{
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
  const [abTest] = useState<{ urlA?: string; urlB?: string }>(
    () => (initialPayload.abTest as { urlA?: string; urlB?: string }) ?? {},
  );

  const canonical = canonicalQrData({
    contentType: initialQr.contentType,
    payload,
    kind: initialQr.kind,
    shortCode: initialQr.shortCode,
    appUrl: typeof window !== "undefined" ? window.location.origin : "",
  });
  const previewData = canonical.data;
  const qrRef = useQrStylingPreview(previewData, style);
  const scan = evaluateScannability(styleToScannability(style));
  const isDynamic = initialQr.kind === "DYNAMIC" || !!typeInfo?.needsHostedPage;
  const dirty =
    name !== initialQr.name ||
    JSON.stringify(payload) !== JSON.stringify(initialPayload) ||
    JSON.stringify(style) !== JSON.stringify(parseStyleConfig(initialQr.styleConfig)) ||
    (isDynamic && (
      expireAt !== toDateTimeLocalValue(initialQr.expireAt) ||
      maxScans !== (initialQr.maxScans != null ? String(initialQr.maxScans) : "") ||
      password !== "" ||
      gdprRequired !== (initialPayload.gdprRequired === true) ||
      gdprPolicyUrl !== String(initialPayload.gdprPolicyUrl ?? "") ||
      JSON.stringify(trackingPixels) !== JSON.stringify(initialPayload.trackingPixels ?? {})
    ));
  const downloadBlockedReason = dirty
    ? "Сначала сохраните изменения — скачивается только сохранённый QR."
    : !canonical.ready
      ? canonical.isDynamic
        ? "Сначала сохраните QR, чтобы скачать короткую ссылку."
        : "Заполните содержимое, чтобы скачать код."
      : !scan.safeToUse
        ? "Контраст или фон небезопасны для сканирования."
        : undefined;

  const shortLink = initialQr.shortCode
    ? qrPublicPath({ shortCode: initialQr.shortCode, contentType: initialQr.contentType })
    : null;

  async function handleSave() {
    if (savePending.current) return;
    savePending.current = true;
    setSaving(true);
    setError("");

    try {

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
      if (!parsed.ok) {
        setError(parsed.error ?? MSG.QR_SAVE_FAILED);
        return;
      }

      if (password.trim()) {
        setHasPassword(true);
        setPassword("");
      }

      router.push(`/dashboard/qr/${initialQr.id}`);
      router.refresh();
    } catch {
      setError(MSG.AUTH_NETWORK_ERROR);
    } finally {
      savePending.current = false;
      setSaving(false);
    }
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

          <QrWizardTabs
            value={activeTab}
            onChange={setActiveTab}
            contentId={contentPanelId}
            designId={designPanelId}
          />

          {activeTab === "content" ? (
            <div
              id={contentPanelId}
              role="tabpanel"
              aria-labelledby={`${contentPanelId}-tab`}
              className="qrs-wizard-card"
            >
              <QrContentForm
                type={initialQr.contentType}
                payload={payload}
                onChange={setPayload}
                workspaceId={workspaceId}
              />
            </div>
          ) : (
            <div id={designPanelId} role="tabpanel" aria-labelledby={`${designPanelId}-tab`}>
              <QrDesigner style={style} onChange={setStyle} workspaceId={workspaceId} />
            </div>
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
          readable={scan.safeToUse}
          downloadBlockedReason={downloadBlockedReason}
          qrId={savedQrIdForDownload(initialQr.id, dirty)}
          lifetimeHint={
            initialQr.kind === "DYNAMIC" ? (
              <QrLifetimeNote variant="download-dynamic" />
            ) : (
              <QrLifetimeNote variant="download-static" />
            )
          }
        />
      </div>
    </div>
  );
}
