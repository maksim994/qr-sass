import Link from "next/link";

type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "danger" | "text";
type ButtonSize = "sm" | "md" | "lg";

type Props = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  href?: string;
  className?: string;
  children: React.ReactNode;
} & (
  | (React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined })
  | (React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string })
);

const variantClass: Record<ButtonVariant, string> = {
  primary: "fk-button--primary",
  accent: "fk-button--accent",
  secondary: "fk-button--secondary",
  ghost: "fk-button--ghost",
  danger: "fk-button--danger",
  text: "fk-button--text",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "fk-button--sm",
  md: "",
  lg: "fk-button--lg",
};

export function Button({
  variant = "primary",
  size = "md",
  block = false,
  href,
  className = "",
  children,
  ...rest
}: Props) {
  const classes = [
    "fk-button",
    variantClass[variant],
    sizeClass[size],
    block ? "fk-button--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link href={href} className={classes} {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  );
}
