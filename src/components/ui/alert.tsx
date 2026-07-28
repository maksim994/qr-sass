import type { ReactNode } from "react";

type AlertVariant = "info" | "success" | "warning" | "danger";
type AlertSize = "md" | "sm";

type Props = {
  variant?: AlertVariant;
  size?: AlertSize;
  title?: ReactNode;
  action?: ReactNode;
  onClose?: () => void;
  className?: string;
  children: ReactNode;
};

function alertIcon(size: AlertSize, variant: AlertVariant): ReactNode {
  const dim = size === "sm" ? 18 : 20;
  const icons: Record<AlertVariant, ReactNode> = {
  info: (
    <svg width={dim} height={dim} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  ),
  success: (
    <svg width={dim} height={dim} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  warning: (
    <svg width={dim} height={dim} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  ),
  danger: (
    <svg width={dim} height={dim} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6M9 9l6 6" />
    </svg>
  ),
  };
  return icons[variant];
}

export function Alert({ variant = "info", size, title, action, onClose, className = "", children }: Props) {
  const resolvedSize: AlertSize = size ?? (title ? "md" : "sm");
  const closeIconSize = resolvedSize === "sm" ? 14 : 16;
  return (
    <div
      className={`fk-alert fk-alert--${variant}${resolvedSize === "sm" ? " fk-alert--sm" : ""}${action ? " fk-alert--has-action" : ""} ${className}`.trim()}
      role="alert"
    >
      <span className="fk-alert__icon">{alertIcon(resolvedSize, variant)}</span>
      <div className="fk-alert__body">
        {title ? <div className="fk-alert__title">{title}</div> : null}
        <div className="fk-alert__text">{children}</div>
      </div>
      {action ? <div className="fk-alert__action">{action}</div> : null}
      {onClose ? (
        <button type="button" className="fk-alert__close fk-icon-button" onClick={onClose} aria-label="Закрыть">
          <svg width={closeIconSize} height={closeIconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
