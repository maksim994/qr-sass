"use client";

import { fetchApi } from "@/lib/client-api";
import { useCallback, useMemo, useRef, useState } from "react";
import { Field, Input, Button } from "@/components/ui";

export type QrStyle = {
  dotType: "square" | "dots" | "rounded" | "classy" | "classy-rounded" | "extra-rounded";
  dotColor: string;
  dotGradient?: { type: "linear" | "radial"; colors: [string, string]; rotation?: number };
  bgColor: string;
  bgTransparent: boolean;
  bgGradient?: { type: "linear" | "radial"; colors: [string, string]; rotation?: number };
  cornerSquareType: "square" | "dot" | "extra-rounded";
  cornerSquareColor: string;
  cornerDotType: "square" | "dot";
  cornerDotColor: string;
  frameStyle: string;
  frameColor: string;
  frameText: string;
  logoUrl: string;
  logoFileId: string;
  logoScale: number;
  logoMargin: number;
  margin: number;
  errorCorrectionLevel: "L" | "M" | "Q" | "H";
};

type Props = {
  style: QrStyle;
  onChange: (style: QrStyle) => void;
  workspaceId: string;
};

const FG_SWATCHES = ["#131720", "#1E4FD1", "#0C8659", "#173885", "#B91C1C", "#7C3AED"];
const BG_SWATCHES = ["#FFFFFF", "#F5F7FA", "#0D1220", "#FEF3C7"];

const EC_LEVELS: { value: QrStyle["errorCorrectionLevel"]; sub: string }[] = [
  { value: "L", sub: "7%" },
  { value: "M", sub: "15%" },
  { value: "Q", sub: "25%" },
  { value: "H", sub: "30%" },
];

function hexLuminance(hex: string) {
  const n = hex.replace("#", "");
  const f = n.length === 3 ? n.split("").map((x) => x + x).join("") : n;
  const rgb = [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255);
  const lin = rgb.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function scoreScannability(fg: string, bg: string, margin: number, logoScale: number): number {
  const l1 = hexLuminance(fg);
  const l2 = hexLuminance(bg);
  const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  let score = 100;
  if (ratio < 4.5) score -= 35;
  if (margin < 2) score -= 15;
  if (logoScale > 0.25) score -= 30;
  return Math.max(0, score);
}

function normalizeHex(value: string) {
  return value.toUpperCase();
}

function DotPreviewSquare() {
  return (
    <svg viewBox="0 0 29 29" width="30" height="30" aria-hidden="true">
      <rect x="2" y="2" width="6" height="6" fill="currentColor" />
      <rect x="11" y="2" width="6" height="6" fill="currentColor" />
      <rect x="20" y="2" width="6" height="6" fill="currentColor" />
      <rect x="2" y="11" width="6" height="6" fill="currentColor" />
      <rect x="20" y="11" width="6" height="6" fill="currentColor" />
      <rect x="2" y="20" width="6" height="6" fill="currentColor" />
      <rect x="11" y="20" width="6" height="6" fill="currentColor" />
      <rect x="20" y="20" width="6" height="6" fill="currentColor" />
    </svg>
  );
}

function DotPreviewRounded() {
  return (
    <svg viewBox="0 0 29 29" width="30" height="30" aria-hidden="true">
      <rect x="2" y="2" width="6" height="6" rx="2.4" fill="currentColor" />
      <rect x="11" y="2" width="6" height="6" rx="2.4" fill="currentColor" />
      <rect x="20" y="2" width="6" height="6" rx="2.4" fill="currentColor" />
      <rect x="2" y="11" width="6" height="6" rx="2.4" fill="currentColor" />
      <rect x="20" y="11" width="6" height="6" rx="2.4" fill="currentColor" />
      <rect x="2" y="20" width="6" height="6" rx="2.4" fill="currentColor" />
      <rect x="11" y="20" width="6" height="6" rx="2.4" fill="currentColor" />
      <rect x="20" y="20" width="6" height="6" rx="2.4" fill="currentColor" />
    </svg>
  );
}

function DotPreviewDots() {
  return (
    <svg viewBox="0 0 29 29" width="30" height="30" aria-hidden="true">
      <circle cx="5" cy="5" r="2.5" fill="currentColor" />
      <circle cx="14" cy="5" r="2.5" fill="currentColor" />
      <circle cx="23" cy="5" r="2.5" fill="currentColor" />
      <circle cx="5" cy="14" r="2.5" fill="currentColor" />
      <circle cx="23" cy="14" r="2.5" fill="currentColor" />
      <circle cx="5" cy="23" r="2.5" fill="currentColor" />
      <circle cx="14" cy="23" r="2.5" fill="currentColor" />
      <circle cx="23" cy="23" r="2.5" fill="currentColor" />
    </svg>
  );
}

function DotPreviewClassy() {
  return (
    <svg viewBox="0 0 29 29" width="30" height="30" aria-hidden="true">
      <rect x="2" y="2" width="6" height="6" fill="currentColor" />
      <rect x="11" y="2" width="6" height="6" rx="3" fill="currentColor" />
      <rect x="20" y="2" width="6" height="6" fill="currentColor" />
      <rect x="2" y="11" width="6" height="6" rx="3" fill="currentColor" />
      <rect x="20" y="11" width="6" height="6" fill="currentColor" />
      <rect x="2" y="20" width="6" height="6" fill="currentColor" />
      <rect x="11" y="20" width="6" height="6" rx="3" fill="currentColor" />
      <rect x="20" y="20" width="6" height="6" fill="currentColor" />
    </svg>
  );
}

function DotPreviewSoft() {
  return (
    <svg viewBox="0 0 29 29" width="30" height="30" aria-hidden="true">
      <rect x="2" y="2" width="6" height="6" rx="3" fill="currentColor" />
      <rect x="11" y="2" width="6" height="6" rx="3" fill="currentColor" />
      <rect x="20" y="2" width="6" height="6" rx="3" fill="currentColor" />
      <rect x="2" y="11" width="6" height="6" rx="3" fill="currentColor" />
      <rect x="20" y="11" width="6" height="6" rx="3" fill="currentColor" />
      <rect x="2" y="20" width="6" height="6" rx="3" fill="currentColor" />
      <rect x="11" y="20" width="6" height="6" rx="3" fill="currentColor" />
      <rect x="20" y="20" width="6" height="6" rx="3" fill="currentColor" />
    </svg>
  );
}

function DotPreviewDiamond() {
  return (
    <svg viewBox="0 0 29 29" width="30" height="30" aria-hidden="true">
      <rect x="4" y="4" width="5" height="5" transform="rotate(45 6.5 6.5)" fill="currentColor" />
      <rect x="13" y="4" width="5" height="5" transform="rotate(45 15.5 6.5)" fill="currentColor" />
      <rect x="22" y="4" width="5" height="5" transform="rotate(45 24.5 6.5)" fill="currentColor" />
      <rect x="4" y="13" width="5" height="5" transform="rotate(45 6.5 15.5)" fill="currentColor" />
      <rect x="22" y="13" width="5" height="5" transform="rotate(45 24.5 15.5)" fill="currentColor" />
      <rect x="4" y="22" width="5" height="5" transform="rotate(45 6.5 24.5)" fill="currentColor" />
      <rect x="13" y="22" width="5" height="5" transform="rotate(45 15.5 24.5)" fill="currentColor" />
      <rect x="22" y="22" width="5" height="5" transform="rotate(45 24.5 24.5)" fill="currentColor" />
    </svg>
  );
}

const dotStyleOptions: { value: QrStyle["dotType"]; label: string; Icon: React.FC }[] = [
  { value: "square", label: "Квадрат", Icon: DotPreviewSquare },
  { value: "rounded", label: "Скругл.", Icon: DotPreviewRounded },
  { value: "dots", label: "Точки", Icon: DotPreviewDots },
  { value: "classy", label: "Классика", Icon: DotPreviewClassy },
  { value: "extra-rounded", label: "Мягкие", Icon: DotPreviewSoft },
  { value: "classy-rounded", label: "Ромб", Icon: DotPreviewDiamond },
];

const cornerSquareOptions: { value: QrStyle["cornerSquareType"]; label: string }[] = [
  { value: "square", label: "Квадрат" },
  { value: "extra-rounded", label: "Скругл." },
  { value: "dot", label: "Круг" },
];

const cornerDotOptions: { value: QrStyle["cornerDotType"]; label: string }[] = [
  { value: "square", label: "Квадрат" },
  { value: "dot", label: "Скругл." },
];

function CornerSquarePreview({ variant }: { variant: QrStyle["cornerSquareType"] }) {
  const r = variant === "square" ? 1 : variant === "dot" ? 9 : 5;
  return (
    <svg viewBox="0 0 26 26" width="26" height="26" aria-hidden="true">
      <rect x="2" y="2" width="22" height="22" rx={r} fill="none" stroke="currentColor" strokeWidth="4" />
    </svg>
  );
}

function CornerDotPreview({ variant }: { variant: QrStyle["cornerDotType"] }) {
  const r = variant === "square" ? 0 : 8;
  return (
    <svg viewBox="0 0 26 26" width="26" height="26" aria-hidden="true">
      <rect x="6" y="6" width="14" height="14" rx={r} fill="currentColor" />
    </svg>
  );
}

function ColorHexRow({
  value,
  onChange,
  disabled,
  compact,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  compact?: boolean;
  ariaLabel: string;
}) {
  const size = compact ? "40px" : "46px";
  return (
    <div className="qrs-color-row">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={ariaLabel}
        className="qrs-color-input"
        style={{ width: size, height: size }}
      />
      <Input
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
        }}
        disabled={disabled}
        placeholder="#000000"
        className="qrs-color-hex"
      />
    </div>
  );
}

function ColorSwatchRow({
  colors,
  active,
  onSelect,
  insetBorder,
}: {
  colors: string[];
  active: string;
  onSelect: (color: string) => void;
  insetBorder?: boolean;
}) {
  return (
    <div className="qrs-swatch-row">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          className="qrs-swatch"
          aria-label={`Цвет ${color}`}
          onClick={() => onSelect(color)}
          style={{
            background: color,
            borderColor: normalizeHex(active) === normalizeHex(color) ? "var(--color-primary)" : "transparent",
            boxShadow: insetBorder ? "inset 0 0 0 1px var(--border-default)" : "var(--shadow-xs)",
          }}
        />
      ))}
    </div>
  );
}

function SectionCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="qrs-design-section-check">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  );
}

function DesignCard({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="qrs-design-card">
      <div className="qrs-design-card-head">
        <div className="qrs-design-card-title">
          {icon}
          {title}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function QrDesigner({ style, onChange, workspaceId }: Props) {
  const [uploading, setUploading] = useState(false);
  const [logoVisible, setLogoVisible] = useState(() => Boolean(style.logoUrl) || style.logoScale > 0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const patch = useCallback(
    (partial: Partial<QrStyle>) => onChange({ ...style, ...partial }),
    [style, onChange],
  );

  const scannability = useMemo(
    () => scoreScannability(style.dotColor, style.bgTransparent ? "#ffffff" : style.bgColor, style.margin, style.logoScale),
    [style.dotColor, style.bgColor, style.bgTransparent, style.margin, style.logoScale],
  );

  const scoreTone =
    scannability >= 85 ? "var(--color-success)" : scannability >= 70 ? "var(--color-warning)" : "var(--color-danger)";
  const scoreBg =
    scannability >= 85 ? "var(--color-success-subtle)" : scannability >= 70 ? "var(--color-warning-subtle)" : "var(--color-danger-subtle)";

  const gradientEnabled = Boolean(style.dotGradient);
  const gradient = style.dotGradient ?? { type: "linear" as const, colors: [style.dotColor, "#1E4FD1"] as [string, string], rotation: 0 };

  async function handleLogoUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workspaceId", workspaceId);
      const res = await fetchApi("/api/upload", { method: "POST", body: formData });
      if (!res.ok) return;
      const data = await res.json();
      setLogoVisible(true);
      patch({
        logoUrl: data.url ?? "",
        logoFileId: data.fileId ?? "",
        logoScale: style.logoScale > 0 ? style.logoScale : 0.2,
      });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="qrs-design-stack">
      <DesignCard
        title="Узор QR-кода"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        }
      >
        <div className="qrs-design-tile-grid">
          {dotStyleOptions.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => patch({ dotType: value })}
              className={`qrs-design-option${style.dotType === value ? " qrs-design-option--active" : ""}`}
            >
              <Icon />
              <span className="qrs-design-option-label">{label}</span>
            </button>
          ))}
        </div>
      </DesignCard>

      <DesignCard
        title="Цвет кода"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
            <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
            <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
            <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-4.9-4.5-8.3-10-8.3Z" />
          </svg>
        }
        action={
          <SectionCheckbox
            label="Градиент"
            checked={gradientEnabled}
            onChange={(checked) =>
              patch({
                dotGradient: checked
                  ? { type: "linear", colors: [style.dotColor, gradient.colors[1] ?? "#1E4FD1"], rotation: 0 }
                  : undefined,
              })
            }
          />
        }
      >
        <ColorHexRow
          value={style.dotColor}
          onChange={(v) =>
            patch({
              dotColor: v,
              ...(gradientEnabled ? { dotGradient: { ...gradient, colors: [v, gradient.colors[1]] } } : {}),
            })
          }
          ariaLabel="Цвет кода"
        />
        <ColorSwatchRow
          colors={FG_SWATCHES}
          active={style.dotColor}
          onSelect={(color) => patch({ dotColor: color })}
        />
        {gradientEnabled ? (
          <div className="qrs-design-subsection qrs-design-subsection--gradient">
            <div className="qrs-design-subsection-label">Второй цвет градиента</div>
            <ColorHexRow
              value={gradient.colors[1]}
              onChange={(v) => patch({ dotGradient: { ...gradient, colors: [gradient.colors[0], v] } })}
              ariaLabel="Второй цвет градиента"
            />
          </div>
        ) : null}
      </DesignCard>

      <DesignCard
        title="Фон"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="m3 15 4-4 3 3 5-5 6 6" />
          </svg>
        }
        action={
          <SectionCheckbox
            label="Прозрачный"
            checked={style.bgTransparent}
            onChange={(checked) => patch({ bgTransparent: checked })}
          />
        }
      >
        {!style.bgTransparent ? (
          <>
            <ColorHexRow
              value={style.bgColor}
              onChange={(v) => patch({ bgColor: v })}
              ariaLabel="Цвет фона"
            />
            <ColorSwatchRow
              colors={BG_SWATCHES}
              active={style.bgColor}
              onSelect={(color) => patch({ bgColor: color, bgTransparent: false })}
              insetBorder
            />
          </>
        ) : null}
      </DesignCard>

      <DesignCard
        title="Уголки"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
          </svg>
        }
      >
        <div className="qrs-design-subsection">
          <div className="qrs-design-subsection-label">Рамка уголка</div>
          <div className="qrs-design-tile-grid qrs-design-tile-grid--corners">
            {cornerSquareOptions.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => patch({ cornerSquareType: value })}
                className={`qrs-design-option qrs-design-option--compact${style.cornerSquareType === value ? " qrs-design-option--active" : ""}`}
              >
                <CornerSquarePreview variant={value} />
                <span className="qrs-design-option-label qrs-design-option-label--compact">{label}</span>
              </button>
            ))}
          </div>
          <ColorHexRow
            value={style.cornerSquareColor}
            onChange={(v) => patch({ cornerSquareColor: v })}
            compact
            ariaLabel="Цвет рамки уголка"
          />
        </div>

        <div className="qrs-design-subsection">
          <div className="qrs-design-subsection-label">Точка уголка</div>
          <div className="qrs-design-tile-grid qrs-design-tile-grid--corners">
            {cornerDotOptions.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => patch({ cornerDotType: value })}
                className={`qrs-design-option qrs-design-option--compact${style.cornerDotType === value ? " qrs-design-option--active" : ""}`}
              >
                <CornerDotPreview variant={value} />
                <span className="qrs-design-option-label qrs-design-option-label--compact">{label}</span>
              </button>
            ))}
          </div>
          <ColorHexRow
            value={style.cornerDotColor}
            onChange={(v) => patch({ cornerDotColor: v })}
            compact
            ariaLabel="Цвет точки уголка"
          />
        </div>
      </DesignCard>

      <DesignCard
        title="Логотип в центре"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
        }
        action={
          <SectionCheckbox
            label="Показать"
            checked={logoVisible}
            onChange={(checked) => {
              setLogoVisible(checked);
              patch({ logoScale: checked ? (style.logoScale > 0 ? style.logoScale : 0.2) : 0 });
            }}
          />
        }
      >
        {logoVisible ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
                e.target.value = "";
              }}
            />
            {style.logoUrl ? (
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <img
                  src={style.logoUrl}
                  alt="Логотип"
                  className="qrs-design-logo-thumb"
                />
                <div style={{ display: "flex", gap: "8px" }}>
                  <Button variant="secondary" size="sm" type="button" onClick={() => fileInputRef.current?.click()}>
                    Заменить
                  </Button>
                  <Button variant="ghost" size="sm" type="button" onClick={() => patch({ logoUrl: "", logoFileId: "", logoScale: 0 })}>
                    Удалить
                  </Button>
                </div>
              </div>
            ) : (
              <label htmlFor="qrs-logo-input" className="qrs-design-logo-upload">
                <span style={{ font: "var(--fw-semibold) 13px/1.3 var(--font-sans)", color: "var(--color-primary)" }}>
                  {uploading ? "Загрузка…" : "Загрузить логотип"}
                </span>
                <span style={{ font: "var(--fw-regular) 12px/1.3 var(--font-sans)", color: "var(--text-muted)" }}>PNG, SVG или JPG · до 2 МБ</span>
                <input
                  id="qrs-logo-input"
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleLogoUpload(file);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
            <Field label={`Размер логотипа (${Math.round(style.logoScale * 100)}%)`}>
              <input
                type="range"
                min={0.12}
                max={0.3}
                step={0.01}
                value={style.logoScale || 0.2}
                onChange={(e) => patch({ logoScale: Number(e.target.value) })}
                style={{ width: "100%", accentColor: "var(--color-primary)" }}
              />
            </Field>
          </>
        ) : null}
      </DesignCard>

      <DesignCard
        title="Дополнительно"
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 7h-9M14 17H5" />
            <circle cx="17" cy="17" r="3" />
            <circle cx="7" cy="7" r="3" />
          </svg>
        }
      >
        <div className="qrs-design-subsection">
          <div className="qrs-design-range-label">
            <span>Отступ (тихая зона)</span>
            <span className="tnum">{style.margin} мод.</span>
          </div>
          <input
            type="range"
            min={0}
            max={8}
            value={style.margin}
            onChange={(e) => patch({ margin: Number(e.target.value) })}
            style={{ width: "100%", accentColor: "var(--color-primary)" }}
          />
        </div>

        <div className="qrs-design-subsection">
          <div className="qrs-design-subsection-label">Уровень коррекции ошибок</div>
          <div className="qrs-design-ec-grid">
            {EC_LEVELS.map(({ value, sub }) => (
              <button
                key={value}
                type="button"
                onClick={() => patch({ errorCorrectionLevel: value })}
                className={`qrs-design-ec-btn${style.errorCorrectionLevel === value ? " qrs-design-ec-btn--active" : ""}`}
              >
                {value}
                <span>{sub}</span>
              </button>
            ))}
          </div>
          <p className="qrs-design-ec-hint">
            Чем выше уровень, тем надёжнее считывается код с логотипом или на неровной поверхности.
          </p>
        </div>

        <Field label="Качество сканирования">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "10px", border: "1px solid var(--border-subtle)", background: "var(--surface-subtle)" }}>
            <span style={{ borderRadius: "999px", padding: "4px 12px", font: "var(--fw-bold) 12px/1 var(--font-sans)", color: scoreTone, background: scoreBg }}>
              {scannability}/100
            </span>
            <div style={{ flex: 1, height: "8px", borderRadius: "999px", background: "var(--surface-sunken)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${scannability}%`, borderRadius: "999px", background: scoreTone, transition: "width var(--dur-base) ease" }} />
            </div>
          </div>
          {scannability < 70 ? (
            <p style={{ marginTop: "8px", font: "var(--fw-regular) 13px/1.4 var(--font-sans)", color: "var(--color-danger)" }}>
              Увеличьте контрастность или отступ для улучшения сканируемости.
            </p>
          ) : null}
        </Field>
      </DesignCard>
    </div>
  );
}
