import Image from "next/image";
import Link from "next/link";

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
  sm: { icon: 32, title: "text-sm", tagline: "text-[10px]" },
  md: { icon: 40, title: "text-lg", tagline: "text-xs" },
  lg: { icon: 48, title: "text-xl", tagline: "text-sm" },
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
  const titleClass = inverted ? "text-white" : "text-slate-900";
  const taglineClass = inverted ? "text-white/75" : "text-slate-500";

  const content = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image
        src="/logo-mark.png"
        alt=""
        width={config.icon}
        height={config.icon}
        className="shrink-0 rounded-lg"
        priority
      />
      <span className="min-w-0 leading-tight">
        <span className={`block font-bold tracking-tight ${config.title} ${titleClass}`}>
          QR-S.ru
          {suffix ? <span className="font-semibold"> {suffix}</span> : null}
        </span>
        {showTagline ? (
          <span
            className={`block ${config.tagline} ${taglineClass} ${responsiveTagline ? "hidden md:block" : ""}`}
          >
            для вашего бизнеса
          </span>
        ) : null}
      </span>
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
