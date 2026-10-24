"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchApi, parseApiResponse } from "@/lib/client-api";
import { clearDownloadQrDraft, readDownloadQrDraft } from "@/lib/download-qr-draft";
import { PRODUCT_GOALS, trackGoal } from "@/lib/product-analytics";
import { QrContentType } from "@prisma/client";

type Props = {
  workspaceId: string;
  allowsDynamic: boolean;
};

export function FulfillDownloadDraft({ workspaceId, allowsDynamic }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    const fromDownload = searchParams.get("from") === "download";
    const draft = readDownloadQrDraft();
    if (!draft) return;
    if (!fromDownload && !allowsDynamic) return;

    started.current = true;

    if (!allowsDynamic) {
      if (fromDownload) {
        router.replace("/dashboard/billing?from=download");
      }
      return;
    }

    void (async () => {
      const body = {
        workspaceId,
        name: draft.name || "Динамический QR",
        kind: "DYNAMIC",
        contentType: draft.contentType as QrContentType,
        payload: draft.payload,
        style: draft.style,
      };

      const response = await fetchApi("/api/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const parsed = await parseApiResponse<{ qrId?: string }>(response);
      clearDownloadQrDraft();

      if (parsed.ok && parsed.data?.qrId) {
        trackGoal(PRODUCT_GOALS.dynamic_qr_created, { contentType: draft.contentType, source: "download_upsell" });
        router.replace(`/dashboard/qr/${parsed.data.qrId}`);
        return;
      }

      if (fromDownload) {
        router.replace("/dashboard/billing?from=download");
      }
    })();
  }, [allowsDynamic, router, searchParams, workspaceId]);

  return null;
}
