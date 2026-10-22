import { publicOpenApi } from "@/lib/public-openapi";
// Public schema contains no credentials, customer QR content, or identifiers.
export async function GET() { return Response.json(publicOpenApi); }
