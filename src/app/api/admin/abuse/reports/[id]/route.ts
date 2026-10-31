import { z } from 'zod';
import { getAdminOrNull } from '@/lib/admin-auth';
import { getDb } from '@/lib/db';
import { apiError, apiSuccess, readJsonBody } from '@/lib/api-response';
import { MSG } from '@/lib/user-messages';
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAdminOrNull(); if (!actor) return apiError(MSG.FORBIDDEN, 'FORBIDDEN', 403);
  const parsed = z.object({ status: z.enum(['IN_REVIEW', 'SPAM', 'RESOLVED_OK']) }).safeParse(await readJsonBody(request));
  if (!parsed.success) return apiError(MSG.INVALID_PAYLOAD, 'VALIDATION_ERROR', 400);
  const { id } = await params;
  await getDb().$transaction(async tx => {
    const previous = await tx.abuseReport.findUniqueOrThrow({ where: { id } });
    await tx.abuseReport.update({ where: { id }, data: { status: parsed.data.status, resolvedBy: actor.id, resolvedAt: new Date() } });
    await tx.adminAuditLog.create({ data: { actorId: actor.id, actorEmail: actor.email, entityId: id, action: 'abuse_report_status', reason: parsed.data.status, before: { status: previous.status }, after: { status: parsed.data.status } } });
  });
  return apiSuccess({ updated: true });
}
