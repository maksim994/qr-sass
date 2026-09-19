import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { selectWorkspace } from "@/lib/workspace-select";
import { CreateQrClient } from "@/components/create-qr-client";
import { getDisabledQrTypes, isQrTypeDisabled } from "@/lib/disabled-qr-types";
import { getQrTypeInfo } from "@/lib/qr-types";
import { getDb } from "@/lib/db";
import { getEntitlements } from "@/lib/entitlements";
import { parseCreatePrefill } from "@/lib/qr-draft";

export default async function CreateTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ url?: string; kind?: string }>;
}) {
  const { type } = await params;
  const typeUpper = type.toUpperCase();
  const typeInfo = getQrTypeInfo(typeUpper);
  if (!typeInfo) redirect("/dashboard/create");

  const disabled = await getDisabledQrTypes();
  if (isQrTypeDisabled(typeUpper, disabled)) redirect("/dashboard/create");

  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  const db = getDb();
  const [entitlements, totalQr] = await Promise.all([
    getEntitlements(workspace.id),
    db.qrCode.count({ where: { workspaceId: workspace.id, isArchived: false } }),
  ]);
  const planInfo = entitlements.plan;
  const qrLimit = planInfo.limits.maxQrCodes;
  const qrRemaining = qrLimit == null ? null : Math.max(0, qrLimit - totalQr);
  const initialDraft = typeUpper === "URL" ? parseCreatePrefill(await searchParams) : null;

  return (
    <CreateQrClient
      workspaceId={workspace.id}
      planGate={{
        allowsDynamic: planInfo.limits.allowsDynamic,
        qrRemaining,
        qrLimitReached: qrLimit != null && totalQr >= qrLimit,
      }}
      initialDraft={initialDraft}
    />
  );
}
