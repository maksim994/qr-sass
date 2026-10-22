import { manageQrApiKeys } from "@/lib/qr-api-key-management";
export async function DELETE(request: Request, { params }: { params: Promise<{ workspaceId: string; keyId: string }> }) {
  const { workspaceId, keyId } = await params;
  return manageQrApiKeys(request, workspaceId, keyId);
}
