import { manageQrApiKeys } from "@/lib/qr-api-key-management";
type Context = { params: Promise<{ workspaceId: string }> };
export async function GET(request: Request, { params }: Context) {
  return manageQrApiKeys(request, (await params).workspaceId);
}
export async function POST(request: Request, { params }: Context) {
  return manageQrApiKeys(request, (await params).workspaceId);
}
