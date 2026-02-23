"use client";

import { useCallback, useMemo, useRef, useState } from "react";

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

/* ── Inline SVG icons for dot styles ── */

function DotPreviewSquare() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8">
      <rect x="2" y="2" width="6" height="6" fill="currentColor" />
      <rect x="9" y="2" width="6" height="6" fill="currentColor" />
      <rect x="16" y="2" width="6" height="6" fill="currentColor" />
      <rect x="2" y="9" width="6" height="6" fill="currentColor" />
      <rect x="16" y="9" width="6" height="6" fill="currentColor" />
      <rect x="2" y="16" width="6" height="6" fill="currentColor" />
      <rect x="9" y="16" width="6" height="6" fill="currentColor" />
      <rect x="16" y="16" width="6" height="6" fill="currentColor" />
    </svg>
  );
}

function DotPreviewDots() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8">
      <circle cx="5" cy="5" r="3" fill="currentColor" />
      <circle cx="12" cy="5" r="3" fill="currentColor" />
      <circle cx="19" cy="5" r="3" fill="currentColor" />
      <circle cx="5" cy="12" r="3" fill="currentColor" />
      <circle cx="19" cy="12" r="3" fill="currentColor" />
      <circle cx="5" cy="19" r="3" fill="currentColor" />
      <circle cx="12" cy="19" r="3" fill="currentColor" />
      <circle cx="19" cy="19" r="3" fill="currentColor" />
    </svg>
  );
}

function DotPreviewRounded() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8">
      <rect x="2" y="2" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="9" y="2" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="16" y="2" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="2" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="16" y="9" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="2" y="16" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="9" y="16" width="6" height="6" rx="1.5" fill="currentColor" />
      <rect x="16" y="16" width="6" height="6" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function DotPreviewClassy() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8">
      <rect x="2" y="2" width="6" height="6" rx="0" fill="currentColor" />
      <rect x="9" y="2" width="6" height="6" rx="3" fill="currentColor" />
      <rect x="16" y="2" width="6" height="6" rx="0" fill="currentColor" />
      <rect x="2" y="9" width="6" height="6" rx="3" fill="currentColor" />
      <rect x="16" y="9" width="6" height="6" rx="0" fill="currentColor" />
      <rect x="2" y="16" width="6" height="6" rx="0" fill="currentColor" />
      <rect x="9" y="16" width="6" height="6" rx="3" fill="currentColor" />
      <rect x="16" y="16" width="6" height="6" rx="0" fill="currentColor" />
    </svg>
  );
}

function DotPreviewClassyRounded() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8">
      <rect x="2" y="2" width="6" height="6" rx="2" fill="currentColor" />
      <rect x="9" y="2" width="6" height="6" rx="3" fill="currentColor" />
      <rect x="16" y="2" width="6" height="6" rx="2" fill="currentColor" />
      <rect x="2" y="9" width="6" height="6" rx="3" fill="currentColor" />
      <rect x="16" y="9" width="6" height="6" rx="2" fill="currentColor" />
      <rect x="2" y="16" width="6" height="6" rx="2" fill="currentColor" />
      <rect x="9" y="16" width="6" height="6" rx="3" fill="currentColor" />
      <rect x="16" y="16" width="6" height="6" rx="2" fill="currentColor" />
    </svg>
  );
}

function DotPreviewExtraRounded() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8">
      <rect x="2" y="2" width="6" height="6" rx="3" fill="currentColor" />
      <rect x="9" y="2" width="6" height="6" rx="3" fill="currentColor" />
      <rect x="16" y="2" width="6" height="6" rx="3" fill="currentColor" />
      <rect x="2" y="9" width="6" height="6" rx="3" fill="currentColor" />
      <rect x="16" y="9" width="6" height="6" rx="3" fill="currentColor" />
      <rect x="2" y="16" width="6" height="6" rx="3" fill="currentColor" />
      <rect x="9" y="16" width="6" height="6" rx="3" fill="currentColor" />
      <rect x="16" y="16" width="6" height="6" rx="3" fill="currentColor" />
    </svg>
  );
}

const dotStyleOptions: { value: QrStyle["dotType"]; label: string; Icon: React.FC }[] = [
  { value: "square", label: "Квадрат", Icon: DotPreviewSquare },
  { value: "dots", label: "Точки", Icon: DotPreviewDots },
  { value: "rounded", label: "Скруглённые", Icon: DotPreviewRounded },
  { value: "classy", label: "Классика", Icon: DotPreviewClassy },
  { value: "classy-rounded", label: "Классика+", Icon: DotPreviewClassyRounded },
  { value: "extra-rounded", label: "Круглые", Icon: DotPreviewExtraRounded },
];

const cornerSquareOptions: { value: QrStyle["cornerSquareType"]; label: string }[] = [
  { value: "square", label: "Квадрат" },
  { value: "dot", label: "Точка" },
  { value: "extra-rounded", label: "Скруглённые" },
];

const cornerDotOptions: { value: QrStyle["cornerDotType"]; label: string }[] = [
  { value: "square", label: "Квадрат" },
  { value: "dot", label: "Точка" },
];

/* ── Section chevron icon ── */

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path
        fillRule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/* ── Section icons ── */

function IconPattern() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path d="M3 4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4zm9 0a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1V4zM3 13a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3zm9 0a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-3a1 1 0 0 1-1-1v-3z" />
    </svg>
  );
}

function IconPalette() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path fillRule="evenodd" d="M3.5 2A1.5 1.5 0 0 0 2 3.5v13A1.5 1.5 0 0 0 3.5 18h13a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 12.378 2H3.5z" clipRule="evenodd" />
    </svg>
  );
}

function IconCorner() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path d="M3.5 3A1.5 1.5 0 0 0 2 4.5v3A1.5 1.5 0 0 0 3.5 9h3A1.5 1.5 0 0 0 8 7.5v-3A1.5 1.5 0 0 0 6.5 3h-3zm0 8A1.5 1.5 0 0 0 2 12.5v3A1.5 1.5 0 0 0 3.5 17h3A1.5 1.5 0 0 0 8 15.5v-3A1.5 1.5 0 0 0 6.5 11h-3zm8-8A1.5 1.5 0 0 0 10 4.5v3A1.5 1.5 0 0 0 11.5 9h3A1.5 1.5 0 0 0 16 7.5v-3A1.5 1.5 0 0 0 14.5 3h-3z" />
    </svg>
  );
}

function IconFrame() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path fillRule="evenodd" d="M4.25 2A2.25 2.25 0 0 0 2 4.25v11.5A2.25 2.25 0 0 0 4.25 18h11.5A2.25 2.25 0 0 0 18 15.75V4.25A2.25 2.25 0 0 0 15.75 2H4.25zM3.5 4.25a.75.75 0 0 1 .75-.75h11.5a.75.75 0 0 1 .75.75v11.5a.75.75 0 0 1-.75.75H4.25a.75.75 0 0 1-.75-.75V4.25z" clipRule="evenodd" />
    </svg>
  );
}

function IconLogo() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a.75.75 0 0 0-1.06 0l-1.91 1.909-4.16-4.159a.75.75 0 0 0-1.06 0L2.5 11.06zm12.22-5.185a1.125 1.125 0 1 0 0 2.25 1.125 1.125 0 0 0 0-2.25z" clipRule="evenodd" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
      <path fillRule="evenodd" d="M8.34 1.804A1 1 0 0 1 9.32 1h1.36a1 1 0 0 1 .98.804l.295 1.473c.497.2.966.46 1.398.77l1.42-.47a1 1 0 0 1 1.187.44l.68 1.178a1 1 0 0 1-.207 1.244l-1.126 1.002a7 7 0 0 1 0 1.518l1.126 1.002a1 1 0 0 1 .207 1.244l-.68 1.178a1 1 0 0 1-1.187.44l-1.42-.47c-.432.31-.901.57-1.398.77l-.295 1.473a1 1 0 0 1-.98.804H9.32a1 1 0 0 1-.98-.804l-.295-1.473a7 7 0 0 1-1.398-.77l-1.42.47a1 1 0 0 1-1.187-.44l-.68-1.178a1 1 0 0 1 .207-1.244l1.126-1.002a7 7 0 0 1 0-1.518L3.566 7.46a1 1 0 0 1-.207-1.244l.68-1.178a1 1 0 0 1 1.187-.44l1.42.47c.432-.31.901-.57 1.398-.77l.295-1.473zM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" clipRule="evenodd" />
    </svg>
  );
}

/* ── Color picker + hex input helper ── */

function ColorPickerField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 p-1 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <input
          className="input max-w-[120px] font-mono text-sm"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
          }}
          disabled={disabled}
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

/* ── Gradient sub-form ── */

function GradientEditor({
  gradient,
  onChange,
}: {
  gradient?: { type: "linear" | "radial"; colors: [string, string]; rotation?: number };
  onChange: (g: { type: "linear" | "radial"; colors: [string, string]; rotation?: number } | undefined) => void;
}) {
  const enabled = !!gradient;
  const g = gradient ?? { type: "linear" as const, colors: ["#000000", "#333333"] as [string, string], rotation: 0 };

  return (
    <div className="mt-3 space-y-3">
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onChange(e.target.checked ? g : undefined)}
          className="h-4 w-4 rounded border-slate-300 accent-blue-600"
        />
        Использовать градиент
      </label>
      {enabled && (
        <div className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:grid-cols-2">
          <ColorPickerField label="Цвет 1" value={g.colors[0]} onChange={(v) => onChange({ ...g, colors: [v, g.colors[1]] })} />
          <ColorPickerField label="Цвет 2" value={g.colors[1]} onChange={(v) => onChange({ ...g, colors: [g.colors[0], v] })} />
          <div>
            <label className="label">Тип</label>
            <select
              className="select"
              value={g.type}
              onChange={(e) => onChange({ ...g, type: e.target.value as "linear" | "radial" })}
            >
              <option value="linear">Линейный</option>
              <option value="radial">Радиальный</option>
            </select>
          </div>
          {g.type === "linear" && (
            <div>
              <label className="label">Угол ({g.rotation ?? 0}°)</label>
              <input
                className="mt-1 w-full accent-blue-600"
                type="range"
                min={0}
                max={360}
                value={g.rotation ?? 0}
                onChange={(e) => onChange({ ...g, rotation: Number(e.target.value) })}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Collapsible section wrapper ── */

function Section({
  title,
  icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="card-flat overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50"
      >
        <span className="text-slate-500">{icon}</span>
        <span className="flex-1 text-sm font-semibold text-slate-900">{title}</span>
        <ChevronIcon open={open} />
      </button>
      {open && <div className="border-t border-slate-100 px-5 py-4 space-y-4">{children}</div>}
    </div>
  );
}

/* ── Main component ── */

export function QrDesigner({ style, onChange, workspaceId }: Props) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    pattern: true,
    background: false,
    corners: false,
    frame: false,
    logo: false,
    additional: false,
  });

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggle = useCallback((key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const patch = useCallback(
    (partial: Partial<QrStyle>) => onChange({ ...style, ...partial }),
    [style, onChange],
  );

  const scannability = useMemo(
    () => scoreScannability(style.dotColor, style.bgTransparent ? "#ffffff" : style.bgColor, style.margin, style.logoScale),
    [style.dotColor, style.bgColor, style.bgTransparent, style.margin, style.logoScale],
  );

  async function handleLogoUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("workspaceId", workspaceId);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) return;
      const data = await res.json();
      patch({ logoUrl: data.url ?? "", logoFileId: data.fileId ?? "" });
    } finally {
      setUploading(false);
    }
  }

  const scoreColor =
    scannability >= 85
      ? "text-green-600 bg-green-50"
      : scannability >= 70
        ? "text-amber-600 bg-amber-50"
        : "text-red-600 bg-red-50";

  return (
    <div className="space-y-3">
      {/* Section 1: QR Pattern */}
      <Section title="Узор QR-кода" icon={<IconPattern />} open={!!openSections.pattern} onToggle={() => toggle("pattern")}>
        <div>
          <label className="label">Стиль точек</label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {dotStyleOptions.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => patch({ dotType: value })}
                className={`card-flat flex flex-col items-center gap-1.5 p-3 transition-colors hover:bg-slate-50 ${
                  style.dotType === value ? "ring-2 ring-blue-500 bg-blue-50/50" : ""
                }`}
              >
                <Icon />
                <span className="text-[11px] leading-tight text-slate-600">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <ColorPickerField label="Цвет точек" value={style.dotColor} onChange={(v) => patch({ dotColor: v })} />

        <GradientEditor gradient={style.dotGradient} onChange={(g) => patch({ dotGradient: g })} />
      </Section>

      {/* Section 2: Background */}
      <Section title="Цвет фона" icon={<IconPalette />} open={!!openSections.background} onToggle={() => toggle("background")}>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={style.bgTransparent}
            onChange={(e) => patch({ bgTransparent: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 accent-blue-600"
          />
          Прозрачный фон
        </label>

        <ColorPickerField
          label="Цвет фона"
          value={style.bgColor}
          onChange={(v) => patch({ bgColor: v })}
          disabled={style.bgTransparent}
        />

        <GradientEditor
          gradient={style.bgGradient}
          onChange={(g) => patch({ bgGradient: g })}
        />
      </Section>

      {/* Section 3: Corners */}
      <Section title="Уголки QR-кода" icon={<IconCorner />} open={!!openSections.corners} onToggle={() => toggle("corners")}>
        <div>
          <label className="label">Стиль рамки уголков</label>
          <div className="grid grid-cols-3 gap-2">
            {cornerSquareOptions.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => patch({ cornerSquareType: value })}
                className={`card-flat px-3 py-2.5 text-center text-sm transition-colors hover:bg-slate-50 ${
                  style.cornerSquareType === value ? "ring-2 ring-blue-500 bg-blue-50/50" : ""
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <ColorPickerField
          label="Цвет рамки уголков"
          value={style.cornerSquareColor}
          onChange={(v) => patch({ cornerSquareColor: v })}
        />

        <div>
          <label className="label">Стиль точек уголков</label>
          <div className="grid grid-cols-2 gap-2">
            {cornerDotOptions.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => patch({ cornerDotType: value })}
                className={`card-flat px-3 py-2.5 text-center text-sm transition-colors hover:bg-slate-50 ${
                  style.cornerDotType === value ? "ring-2 ring-blue-500 bg-blue-50/50" : ""
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <ColorPickerField
          label="Цвет точек уголков"
          value={style.cornerDotColor}
          onChange={(v) => patch({ cornerDotColor: v })}
        />
      </Section>

      {/* Section 4: Frame */}
      <Section title="Рамка" icon={<IconFrame />} open={!!openSections.frame} onToggle={() => toggle("frame")}>
        <div>
          <label className="label">Стиль рамки</label>
          <select
            className="select"
            value={style.frameStyle}
            onChange={(e) => patch({ frameStyle: e.target.value })}
          >
            <option value="none">Без рамки</option>
            <option value="simple">Простая</option>
            <option value="rounded">Скруглённая</option>
            <option value="badge">Бейдж</option>
            <option value="banner">Баннер</option>
          </select>
        </div>

        <ColorPickerField label="Цвет рамки" value={style.frameColor} onChange={(v) => patch({ frameColor: v })} />

        <div>
          <label className="label">Текст на рамке</label>
          <input
            className="input"
            value={style.frameText}
            onChange={(e) => patch({ frameText: e.target.value })}
            placeholder="Сканируй меня"
          />
        </div>
      </Section>

      {/* Section 5: Logo */}
      <Section title="Логотип" icon={<IconLogo />} open={!!openSections.logo} onToggle={() => toggle("logo")}>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleLogoUpload(file);
              e.target.value = "";
            }}
          />
          {style.logoUrl ? (
            <div className="flex items-center gap-4">
              <img
                src={style.logoUrl}
                alt="Логотип"
                className="h-16 w-16 rounded-lg border border-slate-200 object-contain p-1"
              />
              <div className="flex gap-2">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>
                  Заменить
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => patch({ logoUrl: "", logoFileId: "" })}
                >
                  Удалить
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? "Загрузка..." : "Загрузить логотип"}
            </button>
          )}
        </div>

        <div>
          <label className="label">Масштаб логотипа ({style.logoScale.toFixed(2)})</label>
          <input
            className="mt-1 w-full accent-blue-600"
            type="range"
            min={0}
            max={0.3}
            step={0.01}
            value={style.logoScale}
            onChange={(e) => patch({ logoScale: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="label">Отступ логотипа ({style.logoMargin}px)</label>
          <input
            className="mt-1 w-full accent-blue-600"
            type="range"
            min={0}
            max={20}
            value={style.logoMargin}
            onChange={(e) => patch({ logoMargin: Number(e.target.value) })}
          />
        </div>
      </Section>

      {/* Section 6: Additional */}
      <Section title="Дополнительно" icon={<IconSettings />} open={!!openSections.additional} onToggle={() => toggle("additional")}>
        <div>
          <label className="label">Отступ ({style.margin})</label>
          <input
            className="mt-1 w-full accent-blue-600"
            type="range"
            min={0}
            max={8}
            value={style.margin}
            onChange={(e) => patch({ margin: Number(e.target.value) })}
          />
        </div>

        <div>
          <label className="label">Коррекция ошибок</label>
          <select
            className="select"
            value={style.errorCorrectionLevel}
            onChange={(e) => patch({ errorCorrectionLevel: e.target.value as "L" | "M" | "Q" | "H" })}
          >
            <option value="L">L — низкая (7%)</option>
            <option value="M">M — средняя (15%)</option>
            <option value="Q">Q — повышенная (25%)</option>
            <option value="H">H — высокая (30%)</option>
          </select>
        </div>

        <div>
          <label className="label">Качество сканирования</label>
          <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${scoreColor}`}>{scannability}/100</span>
            <div className="flex-1">
              <div className="h-2 rounded-full bg-slate-200">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    scannability >= 85 ? "bg-green-500" : scannability >= 70 ? "bg-amber-500" : "bg-red-500"
                  }`}
                  style={{ width: `${scannability}%` }}
                />
              </div>
            </div>
          </div>
          {scannability < 70 && (
            <p className="text-danger mt-2 text-sm">
              Увеличьте контрастность или отступ для улучшения сканируемости.
            </p>
          )}
        </div>
      </Section>
    </div>
  );
}
