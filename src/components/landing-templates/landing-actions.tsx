import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type LinkActionProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "accent";
  download?: boolean;
  external?: boolean;
  block?: boolean;
  className?: string;
};

export function LandingActionLink({
  href,
  children,
  variant = "primary",
  download,
  external,
  block = true,
  className = "",
}: LinkActionProps) {
  return (
    <Button
      href={href}
      variant={variant}
      block={block}
      className={`qrs-hosted-action ${className}`.trim()}
      {...(download ? { download: true } : {})}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </Button>
  );
}

export function LandingLinkRow({ children }: { children: ReactNode }) {
  return <div className="qrs-hosted-link-row">{children}</div>;
}

export function LandingLinkItem({
  href,
  label,
  external = true,
}: {
  href: string;
  label: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="qrs-hosted-link-item"
    >
      <span>{label}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
      </svg>
    </a>
  );
}
