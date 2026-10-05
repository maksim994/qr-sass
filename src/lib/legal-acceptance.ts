import type { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { LEGAL_VERSION, legalSnapshot } from "@/lib/legal-documents";

export function legalReceipt(source: "email" | "yandex", acceptedAt = new Date()) {
  return {
    version: LEGAL_VERSION, source, acceptedAt,
    termsAccepted: true, dataConsent: true,
    documents: JSON.parse(JSON.stringify(legalSnapshot())) as Prisma.InputJsonValue,
  };
}
export function oauthStateHash(state: string) {
  return createHash("sha256").update(state).digest("hex");
}
