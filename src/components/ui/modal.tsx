"use client";

import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";

type Props = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  size?: "sm" | "md" | "lg";
  footer?: ReactNode;
  children: ReactNode;
};

export function Modal({ open, onClose, title, subtitle, size = "md", footer, children }: Props) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const sizeClass = size === "sm" ? "fk-modal--sm" : size === "lg" ? "fk-modal--lg" : "";

  return createPortal(
    <div className="fk-modal-overlay" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`fk-modal ${sizeClass}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="fk-modal__head">
          <div>
            <h2 id={titleId} className="fk-modal__title">
              {title}
            </h2>
            {subtitle ? <p className="fk-modal__sub">{subtitle}</p> : null}
          </div>
          <Button variant="ghost" size="sm" type="button" onClick={onClose} aria-label="Закрыть">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </Button>
        </div>
        <div className="fk-modal__body">{children}</div>
        {footer ? <div className="fk-modal__foot">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
