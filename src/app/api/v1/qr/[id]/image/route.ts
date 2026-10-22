import { qrApiImage } from "@/lib/qr-api-handlers";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) { return qrApiImage(request, (await params).id); }
