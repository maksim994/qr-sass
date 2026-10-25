import type { Prisma, QrCode, QrModerationStatus } from '@prisma/client';
import { getDb } from '@/lib/db';
import { env } from '@/lib/env';
import { getClientIp } from '@/lib/client-ip';
import { getEntitlements } from '@/lib/entitlements';
import { MSG } from '@/lib/user-messages';
import type { ApiActor } from '@/lib/api-auth';
import type { QrApiActor } from '@/lib/qr-api-auth';
import { extractDestinationUrls } from '@/lib/abuse/extract-urls';
import { checkForQr, type CheckResult } from '@/lib/abuse/url-check';
import { AbuseError, enforceQrRate } from '@/lib/abuse/rate';
export type AbuseActor = { userId?: string; actorType: 'user' | 'api_key' | 'admin' | 'system'; apiKeyId?: string; request?: Request; action?: string };
export function requestActor(request: Request, actor: ApiActor | QrApiActor, action?: string): AbuseActor {
  return 'userId' in actor ? { request, userId: actor.userId, actorType: 'api_key', apiKeyId: actor.key.id, action } : { request, userId: actor.id, actorType: actor.kind === 'apiKey' ? 'api_key' : 'user', apiKeyId: actor.apiKeyId, action };
}
export function moderationDecision(result: CheckResult, freshUnpaid: boolean, previous?: QrModerationStatus): QrModerationStatus {
  if (previous === 'BLOCKED' || previous === 'ON_MODERATION') return previous;
  if (result.verdict === 'malicious' || result.verdict === 'suspicious') return 'ON_MODERATION';
  if (result.verdict === 'unknown') return freshUnpaid ? 'ON_MODERATION' : 'PENDING_CHECK';
  return 'OK';
}
export function qrUrls(qr: Pick<QrCode, 'kind' | 'shortCode' | 'payload' | 'contentType' | 'currentTargetUrl'>) {
  return qr.shortCode || qr.kind === 'DYNAMIC' ? extractDestinationUrls(qr.contentType, qr.payload, qr.currentTargetUrl) : [];
}
export async function auditQr(tx: Prisma.TransactionClient, qr: QrCode, actor: AbuseActor, action: string, before?: QrCode) {
  await tx.qrAuditEvent.create({ data: { qrCodeId: qr.id, shortCode: qr.shortCode, workspaceId: qr.workspaceId, actorUserId: actor.userId, actorType: actor.actorType, apiKeyId: actor.apiKeyId, action,
    oldUrls: before ? qrUrls(before) : undefined, newUrls: qrUrls(qr), ip: actor.request ? getClientIp(actor.request) : null, userAgent: actor.request?.headers.get('user-agent')?.slice(0, 512) } });
}
/** One policy for all public QR writers. Called inside the mutation's transaction. */
export async function applyModeration(tx: Prisma.TransactionClient, qr: QrCode, urls: string[], actor: AbuseActor, batch?: Map<string, CheckResult>) {
  if (!qr.shortCode && qr.kind !== 'DYNAMIC') return qr;
  const owner = await tx.user.findUniqueOrThrow({ where: { id: actor.userId ?? qr.createdById }, select: { createdAt: true, emailVerifiedAt: true } });
  if (env.ABUSE_REQUIRE_VERIFIED_EMAIL && actor.actorType !== 'admin' && actor.actorType !== 'system' && !owner.emailVerifiedAt) throw new AbuseError(MSG.ABUSE_VERIFY_EMAIL);
  const paid = await tx.payment.findFirst({ where: { workspaceId: qr.workspaceId, status: 'SUCCEEDED', isTest: false }, select: { id: true } });
  const fresh = Date.now() - +owner.createdAt < env.ABUSE_NEW_ACCOUNT_HOURS * 3600000 && !paid;
  const check = await checkForQr(urls, qr.name, batch);
  const status = moderationDecision(check, fresh, qr.moderationStatus);
  return tx.qrCode.update({ where: { id: qr.id }, data: { moderationStatus: status, moderationReason: check.reasons.join('; ').slice(0, 2000) || null, moderationAt: new Date(), lastCheckedAt: new Date(), lastCheckVerdict: check.verdict } });
}
export async function createModeratedQr(tx: Prisma.TransactionClient, args: Prisma.QrCodeUncheckedCreateInput, actor: AbuseActor, batch?: Map<string, CheckResult>) {
  // Bulk retains its existing batch limiter; every item still receives a verdict.
  if (actor.request && actor.action !== 'bulk_create') {
    const ent = await getEntitlements(args.workspaceId);
    await enforceQrRate({ request: actor.request, key: actor.actorType === 'api_key' ? args.workspaceId : actor.userId!, paid: ent.planId !== 'FREE' });
  }
  const qr = await tx.qrCode.create({ data: args });
  const updated = await applyModeration(tx, qr, qrUrls(qr), actor, batch);
  await auditQr(tx, updated, actor, actor.action ?? 'create');
  return updated;
}
export async function updateModeratedQr(id: string, data: Prisma.QrCodeUncheckedUpdateInput, actor: AbuseActor) {
  return getDb().$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "QrCode" WHERE id = ${id} FOR UPDATE`;
    const before = await tx.qrCode.findUniqueOrThrow({ where: { id } });
    const proposed = { ...before, ...data } as QrCode;
    const changed = JSON.stringify(qrUrls(before)) !== JSON.stringify(qrUrls(proposed)) || before.name !== proposed.name;
    if (changed && before.moderationStatus === 'BLOCKED') throw new AbuseError(MSG.ABUSE_BLOCKED_EDIT);
    if (changed && actor.request) {
      const ent = await getEntitlements(before.workspaceId);
      await enforceQrRate({ request: actor.request, key: actor.actorType === 'api_key' ? before.workspaceId : actor.userId!, qrId: id, paid: ent.planId !== 'FREE' });
    }
    // Full previous payload supports rollback of smart redirect, A/B and hosted links.
    if (changed) await tx.qrRevision.create({ data: { qrCodeId: id, changedById: actor.userId ?? before.createdById, destinationUrl: before.currentTargetUrl, encodedContent: before.encodedContent, payloadSnapshot: before.payload ?? undefined } });
    const { revisions: _revisions, ...update } = data; void _revisions;
    // Keep /target and payload.url in sync, avoiding stale fallback destinations.
    if (typeof update.currentTargetUrl === 'string' && !update.payload) update.payload = { ...(before.payload as object ?? {}), url: update.currentTargetUrl };
    let qr = await tx.qrCode.update({ where: { id }, data: update });
    if (changed) qr = await applyModeration(tx, qr, qrUrls(qr), actor);
    await auditQr(tx, qr, actor, actor.action ?? (changed ? 'update_url' : 'update_settings'), before);
    return qr;
  }, { timeout: 20000 });
}
