import type { ReactNode } from "react";

type BadgeVariant = "primary" | "accent" | "success" | "warning" | "danger" | "info";
type BadgeSize = "md" | "lg";

type Props = {
  variant?: BadgeVariant;
  size?: BadgeSize;
  solid?: boolean;
  dot?: boolean;
  className?: string;
  children: ReactNode;
};

export function Badge({
  variant = "primary",
  size = "md",
  solid = false,
  dot = false,
  className = "",
  children,
}: Props) {
  const classes = [
    "fk-badge",
    `fk-badge--${variant}`,
    size === "lg" ? "fk-badge--lg" : "",
    solid ? "fk-badge--solid" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes}>
      {dot ? <span className="fk-badge__dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
