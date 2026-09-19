"use client";

import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { useParams, useRouter } from "next/navigation";
import { useId, useState, useSyncExternalStore } from "react";
import { QrContentForm } from "@/components/qr-forms";
import { QrDesigner, type QrStyle } from "@/components/qr-designer";
import { BusinessLanding } from "@/components/landing-templates/business-landing";
import { getQrTypeInfo, supportsDynamicKind } from "@/lib/qr-types";
import { useQrStylingPreview } from "@/hooks/use-qr-styling-preview";
import { QrContentType } from "@prisma/client";
import Link from "next/link";
import { Field, Input, Button, Alert } from "@/components/ui";
import { QrAdvancedSettingsBlock } from "@/components/qr/qr-advanced-settings";
import { canonicalQrData } from "@/lib/qr-canonical";
import { evaluateScannability, styleToScannability } from "@/lib/scannability";
import {
  QrKindSegment,
  QrWizardPageHead,
  QrWizardPreview,
  QrWizardTabs,
} from "@/components/qr/qr-wizard-shared";
import { PRODUCT_GOALS, trackGoal } from "@/lib/product-analytics";
import { QrLifetimeNote } from "@/components/qr/qr-lifetime-note";
import {
  clearQrCreateDraft,
  nameFromUrl,
  parseQrCreateDraft,
  readQrDraftSnapshot,
  subscribeQrDraft,
  type QrCreateDraft,
} from "@/lib/qr-draft";

import styles from "@/components/dashboard/create-flow.module.css";
import { MSG } from "@/lib/user-messages";

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
  initialDraft = null,
}: {
  workspaceId: string;
  planGate: PlanGate;
  initialDraft?: QrCreateDraft | null;
}) {
  const params = useParams();
  const router = useRouter();
  const typeParam = (params.type as string).toUpperCase();
  const typeInfo = getQrTypeInfo(typeParam);
  const canChooseKind = supportsDynamicKind(typeParam);
  const needsDynamicByType = !!typeInfo?.needsHostedPage || typeParam === "VCARD";
  const dynamicBlocked = needsDynamicByType && !planGate.allowsDynamic;

  const storedRaw = useSyncExternalStore(subscribeQrDraft, readQrDraftSnapshot, () => null);
  const storedDraft = typeParam === "URL" ? parseQrCreateDraft(storedRaw) : null;
  const draft = typeParam === "URL" ? initialDraft ?? storedDraft : null;

  const [nameOverride, setNameOverride] = useState<string | null>(null);
  const [kindOverride, setKindOverride] = useState<"STATIC" | "DYNAMIC" | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [style, setStyle] = useState<QrStyle>(defaultStyle);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"content" | "design">("content");
  const contentPanelId = useId();
  const designPanelId = useId();

  const [expireAt, setExpireAt] = useState("");
  const [maxScans, setMaxScans] = useState("");
  const [password, setPassword] = useState("");
  const [gdprRequired, setGdprRequired] = useState(false);
  const [gdprPolicyUrl, setGdprPolicyUrl] = useState("");
  const [smartRedirect] = useState<{ default?: string; ios?: string; android?: string; desktop?: string }>({});
  const [trackingPixels, setTrackingPixels] = useState<{ metaPixelId?: string; ga4Id?: string; gtmId?: string; ymCounterId?: string; vkPixelId?: string }>({});
  const [abTest] = useState<{ urlA?: string; urlB?: string }>({});

  const urlTouched = Object.prototype.hasOwnProperty.call(payload, "url");
  const resolvedUrl = typeParam === "URL"
    ? (urlTouched ? String(payload.url ?? "") : (draft?.url ?? ""))
    : String(payload.url ?? "");
  const formPayload = typeParam === "URL" ? { ...payload, url: resolvedUrl } : payload;
  const requestedKind = kindOverride ?? draft?.kind ?? "STATIC";
  const kind: "STATIC" | "DYNAMIC" = planGate.allowsDynamic ? requestedKind : "STATIC";
  const wantedDynamic = typeParam === "URL" && requestedKind === "DYNAMIC" && !planGate.allowsDynamic;
  const defaultName = typeInfo?.label ? `${typeInfo.label} QR` : "Новый QR";
  const name = nameOverride ?? (resolvedUrl ? nameFromUrl(resolvedUrl) : defaultName);

  const actualKindPreview = typeInfo?.needsHostedPage ? "DYNAMIC" : canChooseKind ? kind : "STATIC";
  const canonical = canonicalQrData({
    contentType: typeParam as QrContentType,
    payload: formPayload,
    kind: actualKindPreview,
    shortCode: null,
    appUrl: typeof window !== "undefined" ? window.location.origin : "",
  });
  const previewData = canonical.data;
  const qrRef = useQrStylingPreview(previewData, style);
  const scan = evaluateScannability(styleToScannability(style));
  const downloadBlockedReason = canonical.isDynamic
    ? "Сначала сохраните QR — иначе скачается неуправляемая ссылка, которую нельзя сменить после печати."
    : !canonical.ready
      ? "Заполните содержимое, чтобы скачать код."
      : undefined;
  const showAdvanced = (kind === "DYNAMIC" && canChooseKind) || !!typeInfo?.needsHostedPage;

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    setError("");

    if (planGate.qrLimitReached) {
      setSaving(false);
      setError(MSG.QR_CREATE_LIMIT);
      return;
    }

    const isHosted = typeInfo?.needsHostedPage;
    const actualKind = isHosted ? "DYNAMIC" : canChooseKind ? kind : "STATIC";

    if ((actualKind === "DYNAMIC" || typeParam === "VCARD") && !planGate.allowsDynamic) {
      setSaving(false);
      setError(MSG.QR_CREATE_DYNAMIC_PLAN);
      return;
    }

    const mergedPayload = { ...formPayload };
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

    try {
      const response = await fetchApi("/api/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const parsed = await parseApiResponse<{ qrId?: string }>(response);
      setSaving(false);

      if (!parsed.ok) {
        setError(parsed.error ?? MSG.COULD_NOT_CREATE_QR);
        return;
      }

      trackGoal(PRODUCT_GOALS.qr_created, { contentType: typeParam, kind: actualKind });
      if (actualKind === "DYNAMIC") {
        trackGoal(PRODUCT_GOALS.dynamic_qr_created, { contentType: typeParam });
      }
      clearQrCreateDraft();

      router.push(`/dashboard/qr/${parsed.data?.qrId}`);
    } catch {
      setError(MSG.AUTH_NETWORK_ERROR);
    } finally {
      setSaving(false);
    }
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
    <div className={styles.editor}>
      <QrWizardPageHead
        backHref="/dashboard/create"
        backLabel="К выбору типа QR"
        contentType={typeParam}
        title={`QR-код: ${typeInfo.label}`}
        subtitle="Добавьте содержимое и настройте оформление перед сохранением."
      />

      <div className="qrs-build-grid">
        <div>
          {(planGate.qrLimitReached ||
            (planGate.qrRemaining != null && planGate.qrRemaining <= 3) ||
            dynamicBlocked ||
            wantedDynamic) && (
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

              {wantedDynamic ? (
                <Alert variant="warning" title="Нужен тариф Про">
                  Вы выбрали код, который можно менять после печати. На бесплатном тарифе доступна только статика.{" "}
                  <Link href="/dashboard/billing" className="qrs-navlink">
                    Перейти на Про
                  </Link>
                </Alert>
              ) : dynamicBlocked ? (
                <Alert variant="warning" title="Нужен тариф Про">
                  Этот тип создаёт динамический QR с короткой ссылкой. На бесплатном тарифе доступны только статические коды.{" "}
                  <Link href="/dashboard/billing" className="qrs-navlink">
                    Перейти на Про
                  </Link>
                </Alert>
              ) : null}
            </div>
          )}

          {canChooseKind ? <section className={styles.mode} aria-labelledby="qr-mode-title">
            <h2 id="qr-mode-title">Как будет работать ссылка</h2>
            <QrKindSegment value={kind} onChange={setKindOverride} disabled={!planGate.allowsDynamic} />
            <p>{kind === "DYNAMIC" ? "Ссылку можно менять после печати. Открытия будут доступны в аналитике." : "Ссылка записана прямо в QR-код. После печати её нельзя изменить; статистика открытий не собирается."}
              {!planGate.allowsDynamic && <> Для смены ссылки и аналитики — <Link href="/dashboard/billing">тариф Про</Link>.</>}
            </p>
          </section> : needsDynamicByType ? <div className={styles.mode}><p>Материал откроется по постоянной ссылке QR-S. Готовый QR появится после сохранения.</p></div> : null}

          <QrWizardTabs
            value={activeTab}
            onChange={setActiveTab}
            contentId={contentPanelId}
            designId={designPanelId}
          />

          <a href="#create-preview" className={styles.previewJump}>К предпросмотру ↓</a>

          {activeTab === "content" ? (
            <div
              id={contentPanelId}
              role="tabpanel"
              aria-labelledby={`${contentPanelId}-tab`}
              className="qrs-wizard-card"
            >
              <p className={styles.contentHint}>{typeInfo.description}</p>
              <QrContentForm
                type={typeParam as QrContentType}
                payload={formPayload}
                onChange={setPayload}
                workspaceId={workspaceId}
              />
            </div>
          ) : (
            <div id={designPanelId} role="tabpanel" aria-labelledby={`${designPanelId}-tab`}>
              <QrDesigner style={style} onChange={setStyle} workspaceId={workspaceId} />
            </div>
          )}

          <div className={styles.nameField}>
            <Field
              label="Название в библиотеке"
              hint={resolvedUrl && !nameOverride ? "Подставили из адреса — можно изменить." : "Укажите название для удобного поиска в библиотеке."}
            >
            <Input
              type="text"
              value={name}
              onChange={(e) => setNameOverride(e.target.value)}
              placeholder="Например, Ссылка на сайт"
            />
          </Field>
          </div>


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
            />
          ) : null}


        </div>

        <QrWizardPreview
          id="create-preview"
          kindLabel={canonical.isDynamic ? "Динамический" : "Статический"}
          previewReady={canonical.ready}
          emptyPreviewTitle={canonical.isDynamic ? "QR появится после создания" : "Здесь будет ваш QR-код"}
          emptyPreviewHint={canonical.isDynamic ? "Сначала сохраним материал и назначим коду постоянную ссылку." : "Заполните содержимое — предпросмотр обновится автоматически."}
          saveDisabled={planGate.qrLimitReached || dynamicBlocked}
          qrRef={qrRef}
          hostedPreview={typeParam === "BUSINESS" ? <BusinessLanding payload={payload} /> : undefined}
          saveLabel="Создать QR-код"
          saving={saving}
          onSave={handleSave}
          error={error}
          previewData={previewData}
          style={style}
          readable={scan.safeToUse}
          downloadBlockedReason={canonical.ready ? downloadBlockedReason : undefined}
          lifetimeHint={
            actualKindPreview === "DYNAMIC" ? (
              <QrLifetimeNote variant="download-dynamic" />
            ) : canonical.ready ? (
              <QrLifetimeNote variant="download-static" />
            ) : null
          }
        />
      </div>
    </div>
  );
}
