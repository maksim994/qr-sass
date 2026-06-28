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
  const box = size === "sm" ? "h-9 w-9" : "h-10 w-10";
  const svgSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const bg = variant === "blue" ? "bg-blue-50" : "bg-slate-100";
  const color = variant === "blue" ? "text-blue-600" : "text-slate-600";

  return (
    <div
      className={`flex ${box} shrink-0 items-center justify-center rounded-lg ${bg} ${className}`}
    >
      <svg
        className={`${svgSize} ${color}`}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
      </svg>
    </div>
  );
}
