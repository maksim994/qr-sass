"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { markOnboardingDownloaded } from "@/lib/product-analytics";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
};

/** Download link that marks onboarding progress + Metrika goal. */
export function TrackedDownloadLink({ children, onClick, ...props }: Props) {
  return (
    <a
      {...props}
      onClick={(event) => {
        markOnboardingDownloaded();
        onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}
