import { qrApiGet, qrApiUpdate } from "@/lib/qr-api-handlers";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) { return qrApiGet(request, (await params).id); }
export async function PATCH(request: Request, { params }: Context) { return qrApiUpdate(request, (await params).id); }
