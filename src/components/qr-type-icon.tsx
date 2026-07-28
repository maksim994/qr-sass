import { getQrTypeInfo } from "@/lib/qr-types";

const FALLBACK_ICON =
  "M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z";

type Props = {
  contentType: string;
  size?: "sm" | "md";
  variant?: "blue" | "slate";
  className?: string;
};

export function QrTypeIcon({
  contentType,
  size = "md",
  variant = "blue",
  className = "",
}: Props) {
  const icon = getQrTypeInfo(contentType)?.icon ?? FALLBACK_ICON;
  const box = size === "sm" ? 36 : 40;
  const svgSize = size === "sm" ? 16 : 20;

  return (
    <span
      className={className}
      style={{
        width: box,
        height: box,
        borderRadius: 10,
        background: variant === "blue" ? "var(--color-primary-subtle)" : "var(--surface-sunken)",
        color: variant === "blue" ? "var(--color-primary)" : "var(--text-muted)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
      }}
    >
      <svg
        width={svgSize}
        height={svgSize}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.75}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d={icon} />
      </svg>
    </span>
  );
}
