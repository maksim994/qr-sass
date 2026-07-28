"use client";

import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { QrContentForm } from "@/components/qr-forms";
import { QrDesigner, type QrStyle } from "@/components/qr-designer";
import { BusinessLanding } from "@/components/landing-templates/business-landing";
import { getQrTypeInfo, supportsDynamicKind } from "@/lib/qr-types";
import { useQrStylingPreview } from "@/hooks/use-qr-styling-preview";
import { QrContentType } from "@prisma/client";
import Link from "next/link";
import { Field, Input, Button, Alert } from "@/components/ui";
import { QrAdvancedSettingsBlock } from "@/components/qr/qr-advanced-settings";
import {
  getQrWizardSubtitle,
  QrKindSegment,
  QrStaticInfoAlert,
  QrWizardPageHead,
  QrWizardPreview,
  QrWizardTabs,
} from "@/components/qr/qr-wizard-shared";
import { PRODUCT_GOALS, trackGoal } from "@/lib/product-analytics";

type PlanGate = {
  allowsDynamic: boolean;
  qrRemaining: number | null;
  qrLimitReached: boolean;
};

const defaultStyle: QrStyle = {
  dotType: "square",
  dotColor: "#131720",
  bgColor: "#ffffff",
  bgTransparent: false,
  cornerSquareType: "square",
  cornerSquareColor: "#131720",
  cornerDotType: "square",
  cornerDotColor: "#131720",
  frameStyle: "none",
  frameColor: "#131720",
  frameText: "",
  logoUrl: "",
  logoFileId: "",
  logoScale: 0,
  logoMargin: 0,
  margin: 2,
  errorCorrectionLevel: "M",
};

export function CreateQrClient({
  workspaceId,
  planGate,
}: {
  workspaceId: string;
  planGate: PlanGate;
}) {
  const params = useParams();
  const router = useRouter();
  const typeParam = (params.type as string).toUpperCase();
  const typeInfo = getQrTypeInfo(typeParam);
  const canChooseKind = supportsDynamicKind(typeParam);
  const needsDynamicByType = !!typeInfo?.needsHostedPage || typeParam === "VCARD";
  const dynamicBlocked = needsDynamicByType && !planGate.allowsDynamic;

  const [name, setName] = useState(typeInfo?.label ? `${typeInfo.label} QR` : "Новый QR");
  const [kind, setKind] = useState<"STATIC" | "DYNAMIC">(
    planGate.allowsDynamic && canChooseKind ? "STATIC" : "STATIC"
  );
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [style, setStyle] = useState<QrStyle>(defaultStyle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"content" | "design">("content");

  const [expireAt, setExpireAt] = useState("");
  const [maxScans, setMaxScans] = useState("");
  const [password, setPassword] = useState("");
  const [gdprRequired, setGdprRequired] = useState(false);
  const [gdprPolicyUrl, setGdprPolicyUrl] = useState("");
  const [smartRedirect, setSmartRedirect] = useState<{ default?: string; ios?: string; android?: string; desktop?: string }>({});
  const [trackingPixels, setTrackingPixels] = useState<{ metaPixelId?: string; ga4Id?: string; gtmId?: string; ymCounterId?: string; vkPixelId?: string }>({});
  const [abTest, setAbTest] = useState<{ urlA?: string; urlB?: string }>({});

  const previewData = useMemo(() => {
    if (typeParam === "URL") return String(payload.url || "https://example.com");
    if (typeParam === "TEXT") return String(payload.text || "Hello");
    if (typeParam === "PHONE") return `tel:${payload.phone || ""}`;
    if (typeParam === "EMAIL") return `mailto:${payload.email || ""}`;
    if (typeParam === "WIFI") return `WIFI:S:${payload.ssid || ""};T:WPA;P:${payload.password || ""};;`;
    if (typeParam === "INSTAGRAM") return `https://instagram.com/${String(payload.username || "example").replace(/^@/, "")}`;
    if (typeParam === "FACEBOOK") return String(payload.pageUrl || "https://facebook.com");
    if (typeParam === "WHATSAPP") return `https://wa.me/${String(payload.phone || "")}`;
    return "https://example.com";
  }, [typeParam, payload]);

  const qrRef = useQrStylingPreview(previewData, style);

  const actualKindPreview = typeInfo?.needsHostedPage ? "DYNAMIC" : canChooseKind ? kind : "STATIC";
  const showAdvanced = (kind === "DYNAMIC" && canChooseKind) || !!typeInfo?.needsHostedPage;
  const showStaticInfo = kind === "STATIC" && canChooseKind && !typeInfo?.needsHostedPage && activeTab === "content";

  async function handleSave() {
    setSaving(true);
    setError("");

    if (planGate.qrLimitReached) {
      setSaving(false);
      setError("Достигнут лимит QR-кодов по тарифу. Обновите тариф или удалите лишние коды.");
      return;
    }

    const isHosted = typeInfo?.needsHostedPage;
    const actualKind = isHosted ? "DYNAMIC" : canChooseKind ? kind : "STATIC";

    if ((actualKind === "DYNAMIC" || typeParam === "VCARD") && !planGate.allowsDynamic) {
      setSaving(false);
      setError("Динамические QR доступны на тарифах Про и Бизнес.");
      return;
    }

    const mergedPayload = { ...payload };
    if (actualKind === "DYNAMIC") {
      mergedPayload.gdprRequired = gdprRequired;
      if (gdprPolicyUrl.trim()) mergedPayload.gdprPolicyUrl = gdprPolicyUrl.trim();
      if (typeParam === "URL") {
        const sr: Record<string, string> = {};
        if (smartRedirect.default?.trim()) sr.default = smartRedirect.default.trim();
        if (smartRedirect.ios?.trim()) sr.ios = smartRedirect.ios.trim();
        if (smartRedirect.android?.trim()) sr.android = smartRedirect.android.trim();
        if (smartRedirect.desktop?.trim()) sr.desktop = smartRedirect.desktop.trim();
        if (Object.keys(sr).length) mergedPayload.smartRedirect = sr;
        const tp: Record<string, string> = {};
        if (trackingPixels.metaPixelId?.trim()) tp.metaPixelId = trackingPixels.metaPixelId.trim();
        if (trackingPixels.ga4Id?.trim()) tp.ga4Id = trackingPixels.ga4Id.trim();
        if (trackingPixels.gtmId?.trim()) tp.gtmId = trackingPixels.gtmId.trim();
        if (trackingPixels.ymCounterId?.trim()) tp.ymCounterId = trackingPixels.ymCounterId.trim();
        if (trackingPixels.vkPixelId?.trim()) tp.vkPixelId = trackingPixels.vkPixelId.trim();
        if (Object.keys(tp).length) mergedPayload.trackingPixels = tp;
        const ab: Record<string, string> = {};
        if (abTest.urlA?.trim()) ab.urlA = abTest.urlA.trim();
        if (abTest.urlB?.trim()) ab.urlB = abTest.urlB.trim();
        if (Object.keys(ab).length === 2) mergedPayload.abTest = ab;
      }
    }

    const body: Record<string, unknown> = {
      workspaceId,
      name,
      kind: actualKind,
      contentType: typeParam as QrContentType,
      payload: mergedPayload,
      style,
    };
    if (actualKind === "DYNAMIC") {
      if (expireAt.trim()) body.expireAt = new Date(expireAt).toISOString();
      if (maxScans.trim()) {
        const n = parseInt(maxScans, 10);
        if (Number.isInteger(n) && n >= 1) body.maxScans = n;
      }
      if (password.trim()) body.password = password;
    }

    const response = await fetchApi("/api/qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const parsed = await parseApiResponse<{ qrId?: string }>(response);
    setSaving(false);

    if (!parsed.ok) {
      setError(parsed.error ?? "Не удалось создать QR-код.");
      return;
    }

    trackGoal(PRODUCT_GOALS.qr_created, { contentType: typeParam, kind: actualKind });
    if (actualKind === "DYNAMIC") {
      trackGoal(PRODUCT_GOALS.dynamic_qr_created, { contentType: typeParam });
    }

    router.push(`/dashboard/qr/${parsed.data?.qrId}`);
  }

  if (!typeInfo) {
    return (
      <div style={{ maxWidth: "480px", margin: "80px auto", textAlign: "center" }}>
        <p style={{ font: "var(--fw-semibold) 18px/1.3 var(--font-display)", color: "var(--text-strong)" }}>
          Тип QR-кода не найден
        </p>
        <Button href="/dashboard/create" className="mt-4">
          Назад к выбору типа
        </Button>
      </div>
    );
  }

  return (
    <div className="qrs-dash-main-inner">
      <QrWizardPageHead
        backHref="/dashboard/create"
        contentType={typeParam}
        title={typeInfo.description}
        subtitle={getQrWizardSubtitle(typeParam, typeInfo.label)}
        kindControl={
          typeInfo.needsHostedPage ? (
            <span className="fk-badge fk-badge--accent">Динамический</span>
          ) : canChooseKind && planGate.allowsDynamic ? (
            <QrKindSegment value={kind} onChange={setKind} />
          ) : canChooseKind && !planGate.allowsDynamic ? (
            <QrKindSegment value="STATIC" onChange={() => {}} disabled />
          ) : (
            <QrKindSegment value="STATIC" onChange={() => {}} disabled />
          )
        }
      />

      <div className="qrs-build-grid">
        <div>
          {(planGate.qrLimitReached ||
            (planGate.qrRemaining != null && planGate.qrRemaining <= 3) ||
            dynamicBlocked) && (
            <div className="qrs-create-alerts">
              {planGate.qrLimitReached ? (
                <Alert variant="warning" title="Лимит QR-кодов">
                  На тарифе больше нельзя создать коды.{" "}
                  <Link href="/dashboard/billing" className="qrs-navlink">
                    Обновить тариф
                  </Link>
                </Alert>
              ) : planGate.qrRemaining != null && planGate.qrRemaining <= 3 ? (
                <Alert variant="info" title="Почти у лимита">
                  Осталось {planGate.qrRemaining} QR по тарифу.{" "}
                  <Link href="/dashboard/billing" className="qrs-navlink">
                    Смотреть тарифы
                  </Link>
                </Alert>
              ) : null}

              {dynamicBlocked ? (
                <Alert variant="warning" title="Нужен тариф Про">
                  Этот тип создаёт динамический QR с короткой ссылкой. На бесплатном тарифе доступны только статические коды.{" "}
                  <Link href="/dashboard/billing" className="qrs-navlink">
                    Перейти на Про
                  </Link>
                </Alert>
              ) : null}
            </div>
          )}

          <div style={{ marginBottom: "22px" }}>
            <Field
              label="Название"
              hint="Укажите название для удобного поиска в библиотеке."
            >
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например, Ссылка на сайт"
            />
          </Field>
          </div>

          <QrWizardTabs value={activeTab} onChange={setActiveTab} />

          {activeTab === "content" ? (
            <div className="qrs-wizard-card">
              <QrContentForm
                type={typeParam as QrContentType}
                payload={payload}
                onChange={setPayload}
                workspaceId={workspaceId}
              />
            </div>
          ) : (
            <QrDesigner style={style} onChange={setStyle} workspaceId={workspaceId} />
          )}

          {showAdvanced ? (
            <QrAdvancedSettingsBlock
              showUrlExtras={typeParam === "URL" && !typeInfo.needsHostedPage}
              expiry={{
                expireAt,
                onExpireAtChange: setExpireAt,
                maxScans,
                onMaxScansChange: setMaxScans,
                password,
                onPasswordChange: setPassword,
                gdprRequired,
                onGdprRequiredChange: setGdprRequired,
                gdprPolicyUrl,
                onGdprPolicyUrlChange: setGdprPolicyUrl,
                minExpireAt: new Date().toISOString().slice(0, 16),
              }}
              trackingPixels={trackingPixels}
              onTrackingPixelsChange={setTrackingPixels}
              abTest={abTest}
              onAbTestChange={setAbTest}
            />
          ) : null}

          {showStaticInfo ? (
            <div style={{ marginTop: "20px" }}>
              <QrStaticInfoAlert />
            </div>
          ) : null}
        </div>

        <QrWizardPreview
          kindLabel={actualKindPreview === "DYNAMIC" ? "Динамический" : "Статический"}
          qrRef={qrRef}
          hostedPreview={typeParam === "BUSINESS" ? <BusinessLanding payload={payload} /> : undefined}
          saveLabel="Создать QR-код"
          saving={saving}
          onSave={handleSave}
          error={error}
          previewData={previewData}
          style={style}
        />
      </div>
    </div>
  );
}
