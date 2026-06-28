import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { selectWorkspace } from "@/lib/workspace-select";
import { CreateQrClient } from "@/components/create-qr-client";
import { getDisabledQrTypes, isQrTypeDisabled } from "@/lib/disabled-qr-types";
import { getQrTypeInfo } from "@/lib/qr-types";

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

  return <CreateQrClient workspaceId={workspace.id} />;
}
