import { qrApiStats } from "@/lib/qr-api-handlers";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) { return qrApiStats(request, (await params).id); }
