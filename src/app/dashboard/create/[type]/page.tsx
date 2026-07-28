import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { selectWorkspace } from "@/lib/workspace-select";
import { CreateQrClient } from "@/components/create-qr-client";
import { getDisabledQrTypes, isQrTypeDisabled } from "@/lib/disabled-qr-types";
import { getQrTypeInfo } from "@/lib/qr-types";
import { getDb } from "@/lib/db";
import { getPlan } from "@/lib/plans";

export default async function CreateTypePage({
  params,
}: {
  params: Promise<{ type: string }>;
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
  const [planInfo, totalQr] = await Promise.all([
    getPlan(workspace.plan),
    db.qrCode.count({ where: { workspaceId: workspace.id, isArchived: false } }),
  ]);
  const qrLimit = planInfo.limits.maxQrCodes;
  const qrRemaining = qrLimit == null ? null : Math.max(0, qrLimit - totalQr);

  return (
    <CreateQrClient
      workspaceId={workspace.id}
      planGate={{
        allowsDynamic: planInfo.limits.allowsDynamic,
        qrRemaining,
        qrLimitReached: qrLimit != null && totalQr >= qrLimit,
      }}
    />
  );
}
