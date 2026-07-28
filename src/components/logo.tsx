import Link from "next/link";
import { LogoMark } from "@/components/logo-mark";

type LogoProps = {
  href?: string | null;
  showTagline?: boolean;
  responsiveTagline?: boolean;
  size?: "sm" | "md" | "lg";
  suffix?: string;
  inverted?: boolean;
  className?: string;
};

const sizeConfig = {
  sm: { icon: 36, title: "17px", tagline: "11px" },
  md: { icon: 40, title: "19px", tagline: "11px" },
  lg: { icon: 48, title: "22px", tagline: "12px" },
} as const;

export function Logo({
  href = "/",
  showTagline = true,
  responsiveTagline = false,
  size = "md",
  suffix,
  inverted = false,
  className = "",
}: LogoProps) {
  const config = sizeConfig[size];
  const titleColor = inverted ? "#fff" : "var(--text-strong)";
  const taglineColor = inverted ? "rgba(255,255,255,0.75)" : "var(--text-muted)";

  const content = (
    <span className={`inline-flex items-center gap-[11px] ${className}`}>
      <LogoMark size={config.icon} />
      <span className="min-w-0 leading-none">
        <span
          style={{
            font: `var(--fw-extra) ${config.title}/1 var(--font-display)`,
            color: titleColor,
            letterSpacing: "-0.02em",
          }}
        >
          QR-S.ru
          {suffix ? <span style={{ fontWeight: 600 }}> {suffix}</span> : null}
        </span>
        {showTagline ? (
          <span
            className={responsiveTagline ? "qrs-logo-tagline" : undefined}
            style={{
              display: responsiveTagline ? undefined : "block",
              marginTop: "3px",
              font: `var(--fw-medium) ${config.tagline}/1.3 var(--font-sans)`,
              color: taglineColor,
            }}
          >
            для вашего бизнеса
          </span>
        ) : null}
      </span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} aria-label="QR-S.ru — на главную" className="inline-flex transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
