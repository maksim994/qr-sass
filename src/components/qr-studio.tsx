"use client";

import { QrContentType, QrKind } from "@prisma/client";
import QRCodeStyling from "qr-code-styling";
import { useEffect, useMemo, useRef, useState } from "react";
import { parseApiResponse } from "@/lib/client-api";
import { logger } from "@/lib/logger";

type Workspace = { id: string; name: string };

type QrItem = {
  id: string;
  name: string;
  kind: QrKind;
  contentType: QrContentType;
  shortCode: string | null;
  currentTargetUrl: string | null;
  _count: { scanEvents: number };
};

type Props = {
  workspace: Workspace;
  initialItems: QrItem[];
};

const contentTypeLabels: Record<string, string> = {
  URL: "Ссылка", TEXT: "Текст", EMAIL: "Email", PHONE: "Телефон", SMS: "SMS",
  WIFI: "Wi-Fi", VCARD: "Визитка", LOCATION: "Геолокация", PDF: "PDF",
  IMAGE: "Изображение", VIDEO: "Видео", MP3: "MP3", MENU: "Меню",
  BUSINESS: "Бизнес", LINK_LIST: "Список ссылок", COUPON: "Купон",
  APP_STORE: "Приложение", INSTAGRAM: "Instagram", FACEBOOK: "Facebook",
  WHATSAPP: "WhatsApp", SOCIAL_LINKS: "Соцсети",
};

const kindLabels: Record<string, string> = {
  STATIC: "Статический",
  DYNAMIC: "Динамический",
};

function encodedContentFromPayload(type: QrContentType, payload: Record<string, string>) {
  switch (type) {
    case "URL":
      return payload.url || "";
    case "TEXT":
      return payload.text || "";
    case "EMAIL":
      return `mailto:${payload.email || ""}?subject=${encodeURIComponent(payload.subject || "")}&body=${encodeURIComponent(payload.body || "")}`;
    case "PHONE":
      return `tel:${payload.phone || ""}`;
    case "SMS":
      return `smsto:${payload.phone || ""}:${payload.message || ""}`;
    case "WIFI":
      return `WIFI:T:${payload.encryption || "WPA"};S:${payload.ssid || ""};P:${payload.password || ""};;`;
    case "VCARD":
      return `BEGIN:VCARD\nVERSION:3.0\nN:${payload.lastName || ""};${payload.firstName || ""}\nFN:${payload.firstName || ""} ${payload.lastName || ""}\nORG:${payload.organization || ""}\nTITLE:${payload.title || ""}\nTEL:${payload.phone || ""}\nEMAIL:${payload.email || ""}\nEND:VCARD`;
    case "LOCATION":
      return `geo:${payload.latitude || ""},${payload.longitude || ""}`;
    default:
      return "";
  }
}

function hexToLuminance(hex: string) {
  const n = hex.replace("#", "");
  const f =
    n.length === 3
      ? n
          .split("")
          .map((x) => x + x)
          .join("")
      : n;
  const rgb = [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255);
  const linear = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function scoreScannability(foreground: string, background: string, margin: number, logoScale: number) {
  const l1 = hexToLuminance(foreground);
  const l2 = hexToLuminance(background);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  let score = 100;
  if (ratio < 4.5) score -= 35;
  if (margin < 2) score -= 15;
  if (logoScale > 0.25) score -= 30;
  return Math.max(0, score);
}

export function QrStudio({ workspace, initialItems }: Props) {
  const [items, setItems] = useState(initialItems);
  const [name, setName] = useState("Основной QR");
  const [kind, setKind] = useState<QrKind>("STATIC");
  const [type, setType] = useState<QrContentType>("URL");
  const [payload, setPayload] = useState<Record<string, string>>({ url: "https://example.com" });
  const [foreground, setForeground] = useState("#111111");
  const [background, setBackground] = useState("#ffffff");
  const [margin, setMargin] = useState(2);
  const [ecc, setEcc] = useState<"L" | "M" | "Q" | "H">("M");
  const [dotStyle, setDotStyle] = useState<"square" | "dots" | "rounded">("square");
  const [cornerStyle, setCornerStyle] = useState<"square" | "dot" | "extra-rounded">("square");
  const [logoScale, setLogoScale] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [dynamicTarget, setDynamicTarget] = useState<Record<string, string>>({});

  const previewData = useMemo(() => encodedContentFromPayload(type, payload), [type, payload]);
  const qualityScore = useMemo(
    () => scoreScannability(foreground, background, margin, logoScale),
    [foreground, background, margin, logoScale],
  );

  const qrRef = useRef<HTMLDivElement>(null);
  const qrInstance = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    if (!qrInstance.current) {
      qrInstance.current = new QRCodeStyling({
        width: 260,
        height: 260,
        data: previewData || "https://example.com",
        margin,
        dotsOptions: { type: dotStyle, color: foreground },
        cornersSquareOptions: { type: cornerStyle, color: foreground },
        cornersDotOptions: { color: foreground },
        backgroundOptions: { color: background },
        qrOptions: { errorCorrectionLevel: ecc },
      });
      if (qrRef.current) qrInstance.current.append(qrRef.current);
      return;
    }

    qrInstance.current.update({
      data: previewData || "https://example.com",
      margin,
      dotsOptions: { type: dotStyle, color: foreground },
      cornersSquareOptions: { type: cornerStyle, color: foreground },
      cornersDotOptions: { color: foreground },
      backgroundOptions: { color: background },
      qrOptions: { errorCorrectionLevel: ecc },
    });
  }, [background, cornerStyle, dotStyle, ecc, foreground, margin, previewData]);

  async function reloadItems() {
    const response = await fetch(`/api/qr?workspaceId=${workspace.id}`);
    const parsed = await parseApiResponse<{ items?: QrItem[] }>(response);
    if (!parsed.ok) {
      logger.warn({
        area: "ui",
        route: "/dashboard",
        message: "Could not refresh QR list",
        code: parsed.code ?? "REQUEST_ERROR",
        status: parsed.status,
      });
      setError(parsed.error ?? "Не удалось обновить список.");
      return;
    }
    setItems(parsed.data?.items ?? []);
  }

  async function createQr() {
    setSaving(true);
    setError("");
    const response = await fetch("/api/qr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: workspace.id,
        name,
        kind,
        contentType: type,
        payload,
        style: {
          foreground,
          background,
          margin,
          errorCorrectionLevel: ecc,
          logoScale,
          dotStyle,
          cornerStyle,
          preset: qualityScore >= 85 ? "high-contrast" : "custom",
        },
      }),
    });
    const parsed = await parseApiResponse<{ score?: { score?: number }; qrId?: string }>(response);
    setSaving(false);
    if (!parsed.ok) {
      logger.warn({
        area: "ui",
        route: "/dashboard",
        message: "Could not create QR",
        code: parsed.code ?? "REQUEST_ERROR",
        status: parsed.status,
      });
      setError(parsed.error ?? "Не удалось создать QR-код");
      return;
    }
    await reloadItems();
  }

  async function updateTarget(id: string) {
    const targetUrl = dynamicTarget[id];
    if (!targetUrl) return;

    const response = await fetch(`/api/qr/${id}/target`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUrl }),
    });
    const parsed = await parseApiResponse<{ updated?: boolean }>(response);
    if (parsed.ok) {
      await reloadItems();
      return;
    }
    setError(parsed.error ?? "Не удалось обновить URL.");
  }

  function payloadFieldsForType() {
    if (type === "URL") {
      return (
        <div>
          <label className="label">URL-адрес</label>
          <input
            className="input"
            value={payload.url ?? ""}
            onChange={(e) => setPayload({ url: e.target.value })}
            placeholder="https://example.com"
          />
        </div>
      );
    }
    if (type === "TEXT") {
      return (
        <div>
          <label className="label">Текст</label>
          <textarea
            className="textarea"
            value={payload.text ?? ""}
            onChange={(e) => setPayload({ text: e.target.value })}
            placeholder="Ваш текст"
          />
        </div>
      );
    }
    if (type === "WIFI") {
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Имя сети (SSID)</label>
            <input
              className="input"
              value={payload.ssid ?? ""}
              onChange={(e) => setPayload((p) => ({ ...p, ssid: e.target.value }))}
              placeholder="MyNetwork"
            />
          </div>
          <div>
            <label className="label">Пароль</label>
            <input
              className="input"
              value={payload.password ?? ""}
              onChange={(e) => setPayload((p) => ({ ...p, password: e.target.value }))}
              placeholder="Пароль сети"
            />
          </div>
        </div>
      );
    }
    if (type === "EMAIL") {
      return (
        <div className="grid gap-3">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              value={payload.email ?? ""}
              onChange={(e) => setPayload((p) => ({ ...p, email: e.target.value }))}
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="label">Тема</label>
            <input
              className="input"
              value={payload.subject ?? ""}
              onChange={(e) => setPayload((p) => ({ ...p, subject: e.target.value }))}
              placeholder="Тема письма"
            />
          </div>
        </div>
      );
    }
    if (type === "PHONE") {
      return (
        <div>
          <label className="label">Номер телефона</label>
          <input
            className="input"
            value={payload.phone ?? ""}
            onChange={(e) => setPayload({ phone: e.target.value })}
            placeholder="+7 999 123 45 67"
          />
        </div>
      );
    }
    return (
      <div>
        <label className="label">Значение</label>
        <input
          className="input"
          value={payload.url ?? ""}
          onChange={(e) => setPayload((p) => ({ ...p, url: e.target.value }))}
          placeholder="Основное значение"
        />
      </div>
    );
  }

  const qualityColor =
    qualityScore >= 85 ? "text-green-600 bg-green-50" : qualityScore >= 70 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50";

  return (
    <div className="space-y-6">
      {/* Top row: Form + Preview */}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Create form */}
        <div className="card p-6">
          <h2 className="heading-md">Создание QR-кода</h2>
          <p className="text-sm mt-1 text-slate-500">Настройте содержимое и стиль вашего QR-кода.</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="label">Название</label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Например: QR для меню"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Тип QR</label>
                <select className="select" value={kind} onChange={(e) => setKind(e.target.value as QrKind)}>
                  {Object.values(QrKind).map((v) => (
                    <option key={v} value={v}>{kindLabels[v]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Тип контента</label>
                <select className="select" value={type} onChange={(e) => setType(e.target.value as QrContentType)}>
                  {Object.values(QrContentType).map((v) => (
                    <option key={v} value={v}>{contentTypeLabels[v]}</option>
                  ))}
                </select>
              </div>
            </div>

            {payloadFieldsForType()}

            {/* Style controls */}
            <div className="border-t border-slate-100 pt-4">
              <p className="text-sm font-semibold text-slate-900">Стиль</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Цвет модулей</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={foreground}
                      onChange={(e) => setForeground(e.target.value)}
                      className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 p-1"
                    />
                    <span className="text-sm text-slate-500">{foreground}</span>
                  </div>
                </div>
                <div>
                  <label className="label">Цвет фона</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={background}
                      onChange={(e) => setBackground(e.target.value)}
                      className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 p-1"
                    />
                    <span className="text-sm text-slate-500">{background}</span>
                  </div>
                </div>
                <div>
                  <label className="label">Отступ ({margin})</label>
                  <input className="mt-1 w-full accent-blue-600" type="range" min={1} max={8} value={margin} onChange={(e) => setMargin(Number(e.target.value))} />
                </div>
                <div>
                  <label className="label">Масштаб лого ({logoScale.toFixed(2)})</label>
                  <input className="mt-1 w-full accent-blue-600" type="range" min={0} max={0.3} step={0.01} value={logoScale} onChange={(e) => setLogoScale(Number(e.target.value))} />
                </div>
                <div>
                  <label className="label">Коррекция ошибок</label>
                  <select className="select" value={ecc} onChange={(e) => setEcc(e.target.value as "L" | "M" | "Q" | "H")}>
                    {["L", "M", "Q", "H"].map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Форма точек</label>
                  <select className="select" value={dotStyle} onChange={(e) => setDotStyle(e.target.value as "square" | "dots" | "rounded")}>
                    <option value="square">Квадратные</option>
                    <option value="dots">Точки</option>
                    <option value="rounded">Скруглённые</option>
                  </select>
                </div>
                <div>
                  <label className="label">Форма углов</label>
                  <select
                    className="select"
                    value={cornerStyle}
                    onChange={(e) => setCornerStyle(e.target.value as "square" | "dot" | "extra-rounded")}
                  >
                    <option value="square">Квадратные</option>
                    <option value="dot">Точки</option>
                    <option value="extra-rounded">Скруглённые</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Quality + Create */}
          <div className="mt-6 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${qualityColor}`}>
                {qualityScore}/100
              </span>
              <span className="text-sm text-slate-600">Качество сканирования</span>
            </div>
            <button
              disabled={saving || qualityScore < 70}
              onClick={createQr}
              className="btn btn-primary btn-sm disabled:opacity-50"
            >
              {saving ? "Сохранение..." : "Создать QR"}
            </button>
          </div>
          {qualityScore < 70 && (
            <p className="text-danger mt-2 text-sm">Увеличьте контрастность или отступ для улучшения сканируемости.</p>
          )}
          {error && <p className="text-danger mt-2 text-sm">{error}</p>}
        </div>

        {/* Preview */}
        <div className="card p-6">
          <h3 className="heading-md">Предпросмотр</h3>
          <div className="mt-4 flex justify-center rounded-xl border border-slate-100 bg-white p-6">
            <div ref={qrRef} />
          </div>
          <p className="mt-3 text-center text-xs text-slate-400">
            Встроенные ограничения защищают от ошибок сканирования.
          </p>
        </div>
      </div>

      {/* QR Library */}
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="heading-md">Библиотека QR-кодов</h3>
          <button onClick={reloadItems} className="btn btn-secondary btn-sm">
            Обновить
          </button>
        </div>

        {items.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center">
            <svg className="mx-auto h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
            </svg>
            <p className="mt-3 text-sm text-slate-500">QR-коды ещё не созданы. Создайте первый выше.</p>
          </div>
        )}

        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 transition hover:shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className="badge">{kindLabels[item.kind]}</span>
                    <span className="badge">{contentTypeLabels[item.contentType]}</span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      {item._count.scanEvents} скан.
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a href={`/api/qr/${item.id}/download?format=png`} className="btn btn-secondary btn-sm">
                    PNG
                  </a>
                  <a href={`/api/qr/${item.id}/download?format=svg`} className="btn btn-secondary btn-sm">
                    SVG
                  </a>
                </div>
              </div>
              {item.kind === "DYNAMIC" && (
                <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row">
                  <input
                    className="input flex-1"
                    value={dynamicTarget[item.id] ?? item.currentTargetUrl ?? ""}
                    onChange={(e) => setDynamicTarget((s) => ({ ...s, [item.id]: e.target.value }))}
                    placeholder="https://new-url.example"
                  />
                  <button onClick={() => updateTarget(item.id)} className="btn btn-primary btn-sm">
                    Обновить URL
                  </button>
                </div>
              )}
              {item.kind === "DYNAMIC" && item.shortCode && (
                <p className="mt-2 text-xs text-slate-400">Короткая ссылка: /r/{item.shortCode}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
