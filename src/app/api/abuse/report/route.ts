import { apiError, apiSuccess, readJsonBody } from '@/lib/api-response';
import { MSG } from '@/lib/user-messages';
import { reportSchema, submitAbuseReport } from '@/lib/abuse/reports';
import { abuseErrorResponse } from '@/lib/abuse/http';
export async function POST(request: Request) {
  const parsed = reportSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return apiError(MSG.INVALID_PAYLOAD, 'VALIDATION_ERROR', 400);
  try { await submitAbuseReport(request, parsed.data); return apiSuccess({ message: MSG.ABUSE_REPORT_SENT }); }
  catch (error) { return abuseErrorResponse(error) ?? apiError(MSG.UNEXPECTED_RESPONSE, 'INTERNAL_ERROR', 500); }
}
