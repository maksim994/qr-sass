"use client";

import { useRef, useState, type AnchorHTMLAttributes, type ReactNode } from "react";
import { markOnboardingDownloaded, PRODUCT_GOALS, trackGoal } from "@/lib/product-analytics";
import { downloadQrFile } from "@/lib/download-qr-file";
import { MSG } from "@/lib/user-messages";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode };

export function TrackedDownloadLink({ children, onClick, ...props }: Props) {
  const busy = useRef(false);
  const [error, setError] = useState(false);
  return <>
    <a {...props} onClick={async event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) {
        trackGoal(PRODUCT_GOALS.qr_download_requested, { source: "library" });
        onClick?.(event);
        return;
      }
      if (!props.href) return;
      event.preventDefault();
      if (busy.current) return;
      busy.current = true;
      setError(false);
      try {
        await downloadQrFile(props.href);
        const format = new URL(props.href, window.location.origin).searchParams.get("format");
        markOnboardingDownloaded({ source: "library", ...(format ? { format } : {}) });
        onClick?.(event);
      } catch { setError(true); }
      finally { busy.current = false; }
    }}>{children}</a>
    {error && <span role="alert">{MSG.COULD_NOT_DOWNLOAD}</span>}
  </>;
}
