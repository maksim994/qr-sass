import { redirect, notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { selectWorkspace } from "@/lib/workspace-select";
import { EditQrClient } from "@/components/edit-qr-client";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditQrPage({ params }: Props) {
  const { id } = await params;
  const user = await requireUser();
  const workspace = await selectWorkspace(user.memberships);
  if (!workspace) redirect("/register");

  const db = getDb();
  const qr = await db.qrCode.findUnique({
    where: { id },
  });

  if (!qr || qr.workspaceId !== workspace.id) notFound();

  return (
    <EditQrClient
      workspaceId={workspace.id}
      initialQr={{
        id: qr.id,
        name: qr.name,
        kind: qr.kind,
        contentType: qr.contentType,
        payload: (qr.payload as Record<string, unknown>) ?? {},
        styleConfig: (qr.styleConfig as Record<string, unknown>) ?? {},
        shortCode: qr.shortCode,
        expireAt: qr.expireAt?.toISOString() ?? null,
        maxScans: qr.maxScans,
        hasPassword: !!qr.passwordHash,
      }}
    />
  );
}
