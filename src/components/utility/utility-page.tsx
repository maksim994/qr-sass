import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

type UtilityVariant = "warning" | "info" | "lock" | "brand";

type Props = {
  variant?: UtilityVariant;
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  showLogo?: boolean;
};

const defaultIcons: Record<UtilityVariant, ReactNode> = {
  warning: (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  info: (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  ),
  lock: (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  ),
  brand: (
    <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  ),
};

export function UtilityPage({
  variant = "info",
  icon,
  title,
  description,
  children,
  showLogo = true,
}: Props) {
  return (
    <div className="qrs-utility">
      <div className="qrs-utility__inner">
        {showLogo ? (
          <div className="qrs-utility__logo">
            <Logo href="/" size="sm" showTagline={false} />
          </div>
        ) : null}

        <div className="qrs-utility__card">
          <div className={`qrs-utility__icon qrs-utility__icon--${variant}`} aria-hidden="true">
            {icon ?? defaultIcons[variant]}
          </div>
          <h1 className="qrs-utility__title">{title}</h1>
          {description ? <p className="qrs-utility__description">{description}</p> : null}
          {children ? <div className="qrs-utility__body">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}
