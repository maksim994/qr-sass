import { getAdminOrNull } from '@/lib/admin-auth';
import { getDb } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/api-response';
import { MSG } from '@/lib/user-messages';
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getAdminOrNull(); if (!actor) return apiError(MSG.FORBIDDEN, 'FORBIDDEN', 403);
  const { id } = await params;
  await getDb().$transaction(async tx => {
    const before = await tx.abuseRule.findUnique({ where: { id } }); if (!before) return;
    await tx.abuseRule.delete({ where: { id } });
    await tx.adminAuditLog.create({ data: { actorId: actor.id, actorEmail: actor.email, entityId: id, action: 'abuse_rule_delete', reason: 'Удаление правила', after: {}, before: { kind: before.kind, value: before.value } } });
  });
  return apiSuccess({ deleted: true });
}
