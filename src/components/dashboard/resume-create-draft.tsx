"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  createQrContinuePath,
  parseQrCreateDraft,
  readQrDraftSnapshot,
  subscribeQrDraft,
} from "@/lib/qr-draft";
import { Alert } from "@/components/ui";

export function ResumeCreateDraft() {
  const raw = useSyncExternalStore(subscribeQrDraft, readQrDraftSnapshot, () => null);
  const draft = parseQrCreateDraft(raw);
  if (!draft) return null;

  return (
    <div className="qrs-create-alerts">
      <Alert variant="info" title="Продолжить черновик">
        Ссылка {draft.url} уже сохранена.{" "}
        <Link href={createQrContinuePath(draft)} className="qrs-navlink">
          Открыть мастер
        </Link>
        , не выбирая тип заново.
      </Alert>
    </div>
  );
}
