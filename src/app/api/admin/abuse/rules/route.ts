import { getAdminOrNull } from '@/lib/admin-auth';
import { getDb } from '@/lib/db';
import { apiError, apiSuccess, readJsonBody } from '@/lib/api-response';
import { MSG } from '@/lib/user-messages';
import { normalizeRule, ruleSchema } from '@/lib/abuse/admin';
export async function GET() {
  if (!await getAdminOrNull()) return apiError(MSG.FORBIDDEN, 'FORBIDDEN', 403);
  return apiSuccess({ rules: await getDb().abuseRule.findMany({ orderBy: { createdAt: 'desc' }, take: 1000 }) });
}
export async function POST(request: Request) {
  const actor = await getAdminOrNull(); if (!actor) return apiError(MSG.FORBIDDEN, 'FORBIDDEN', 403);
  const parsed = ruleSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) return apiError(MSG.INVALID_PAYLOAD, 'VALIDATION_ERROR', 400);
  try {
    const input = normalizeRule(parsed.data);
    const rule = await getDb().$transaction(async tx => {
      const previous = await tx.abuseRule.findUnique({ where: { kind_value: { kind: input.kind, value: input.value } } });
      const rule = await tx.abuseRule.upsert({ where: { kind_value: { kind: input.kind, value: input.value } }, create: { ...input, createdBy: actor.id }, update: { action: input.action, note: input.note } });
      await tx.adminAuditLog.create({ data: { actorId: actor.id, actorEmail: actor.email, entityId: rule.id, action: 'abuse_rule_save', reason: input.note || 'Правило модерации', before: previous ? { kind: previous.kind, value: previous.value, action: previous.action, note: previous.note } : {}, after: { ...input } } });
      return rule;
    });
    return apiSuccess({ rule });
  } catch { return apiError(MSG.INVALID_PAYLOAD, 'VALIDATION_ERROR', 400); }
}
