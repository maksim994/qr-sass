import { getAdminOrNull } from '@/lib/admin-auth';
import { apiError, apiSuccess, readJsonBody } from '@/lib/api-response';
import { MSG } from '@/lib/user-messages';
import { moderateQr, moderationSchema } from '@/lib/abuse/admin';
import { abuseErrorResponse } from '@/lib/abuse/http';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAdminOrNull();
  if (!actor) return apiError(MSG.FORBIDDEN, 'FORBIDDEN', 403);
  const parsed = moderationSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return apiError(MSG.INVALID_PAYLOAD, 'VALIDATION_ERROR', 400);
  try { const qr = await moderateQr((await params).id, parsed.data, actor, request); return apiSuccess({ moderationStatus: qr.moderationStatus }); }
  catch (error) { return abuseErrorResponse(error) ?? apiError(MSG.UNEXPECTED_RESPONSE, 'INTERNAL_ERROR', 500); }
}
