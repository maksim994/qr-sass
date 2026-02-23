import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { selectWorkspace } from "@/lib/workspace-select";
import { CreateQrClient } from "@/components/create-qr-client";

export default async function CreateTypePage() {
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  return <CreateQrClient workspaceId={workspace.id} />;
}
