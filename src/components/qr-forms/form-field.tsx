"use client";

import { Children, cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";

type Props = {
  label: string;
  className?: string;
  hint?: string;
  children: ReactNode;
};

export function FormField({ label, className, hint, children }: Props) {
  const id = useId();
  const hintId = useId();
  const child = Children.only(children);
  if (!isValidElement(child)) return null;
  const control = cloneElement(child as ReactElement<{ id?: string; "aria-describedby"?: string }>, {
    id: (child.props as { id?: string }).id ?? id,
    "aria-describedby": hint ? hintId : (child.props as { "aria-describedby"?: string })["aria-describedby"],
  });

  return (
    <div className={className}>
      <label className="label" htmlFor={(control.props as { id?: string }).id}>
        {label}
      </label>
      {control}
      {hint ? (
        <p id={hintId} className="mt-1 text-xs qrs-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
