"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";
import { useFocusTrap } from "@/hooks/use-focus-trap";

type Props = {
  open: boolean;
  onClose: () => void;
  closeDisabled?: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  size?: "sm" | "md" | "lg";
  footer?: ReactNode;
  children: ReactNode;
};

export function Modal({ open, onClose, closeDisabled = false, title, subtitle, size = "md", footer, children }: Props) {
  const titleId = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const handleEscape = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const overlay = overlayRef.current;
    const siblings = Array.from(document.body.children).filter((node) => node !== overlay);
    siblings.forEach((node) => {
      if (node instanceof HTMLElement) node.inert = true;
    });
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      siblings.forEach((node) => {
        if (node instanceof HTMLElement) node.inert = false;
      });
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Restore background interactivity before returning focus to the trigger.
  useFocusTrap(open, dialogRef, handleEscape);

  if (!open || typeof document === "undefined") return null;

  const sizeClass = size === "sm" ? "fk-modal--sm" : size === "lg" ? "fk-modal--lg" : "";

  return createPortal(
    <div
      ref={overlayRef}
      className="fk-modal-overlay"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        className={`fk-modal ${sizeClass}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="fk-modal__head">
          <div>
            <h2 id={titleId} className="fk-modal__title">
              {title}
            </h2>
            {subtitle ? <p className="fk-modal__sub">{subtitle}</p> : null}
          </div>
          <Button variant="ghost" size="sm" type="button" onClick={onClose} disabled={closeDisabled} aria-label="Закрыть">
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
