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
export function moderationDecision(result: CheckResult, previous?: QrModerationStatus): QrModerationStatus {
  if (previous === 'BLOCKED' || previous === 'ON_MODERATION') return previous;
  if (result.verdict === 'malicious' || result.verdict === 'suspicious') return 'ON_MODERATION';
  if (result.verdict === 'unknown' || result.deferred) return 'PENDING_CHECK';
  return 'OK';
}
type DestinationInput = { kind: string; shortCode?: string | null; payload?: unknown; contentType: string; currentTargetUrl?: string | null };
export function qrUrls(qr: DestinationInput) {
  return qr.shortCode || qr.kind === 'DYNAMIC' ? extractDestinationUrls(qr.contentType, qr.payload, qr.currentTargetUrl) : [];
}
export async function auditQr(tx: Prisma.TransactionClient, qr: QrCode, actor: AbuseActor, action: string, before?: QrCode) {
  await tx.qrAuditEvent.create({ data: { qrCodeId: qr.id, shortCode: qr.shortCode, workspaceId: qr.workspaceId, actorUserId: actor.userId, actorType: actor.actorType, apiKeyId: actor.apiKeyId, action,
    oldUrls: before ? qrUrls(before) : undefined, newUrls: qrUrls(qr), ip: actor.request ? getClientIp(actor.request) : null, userAgent: actor.request?.headers.get('user-agent')?.slice(0, 512) } });
}
/** Network-free: apply a verdict prepared before taking QR/workspace row locks. */
export async function applyModeration(tx: Prisma.TransactionClient, qr: QrCode, check: CheckResult, actor: AbuseActor) {
  if (!qr.shortCode && qr.kind !== 'DYNAMIC') return qr;
  const ownerId = actor.actorType === 'user' || actor.actorType === 'api_key' ? actor.userId ?? qr.createdById : qr.createdById;
  const owner = await tx.user.findUniqueOrThrow({ where: { id: ownerId }, select: { createdAt: true, emailVerifiedAt: true } });
  if (env.ABUSE_REQUIRE_VERIFIED_EMAIL && actor.actorType !== 'admin' && actor.actorType !== 'system' && !owner.emailVerifiedAt) throw new AbuseError(MSG.ABUSE_VERIFY_EMAIL);
  const paid = await tx.payment.findFirst({ where: { workspaceId: qr.workspaceId, status: 'SUCCEEDED', isTest: false }, select: { id: true } });
  const fresh = Date.now() - +owner.createdAt < env.ABUSE_NEW_ACCOUNT_HOURS * 3600000 && !paid;
  const status = moderationDecision(check, qr.moderationStatus);
  const holdUntilCheck = status === 'PENDING_CHECK' && (fresh || qr.holdUntilCheck);
  return tx.qrCode.update({ where: { id: qr.id }, data: {
    moderationStatus: status, holdUntilCheck,
    moderationReason: qr.moderationStatus === 'ON_MODERATION' || qr.moderationStatus === 'BLOCKED' ? qr.moderationReason : check.reasons.join('; ').slice(0, 2000) || null,
    moderationAt: new Date(), lastCheckedAt: new Date(), lastCheckVerdict: check.verdict,
  } });
}
/** All expensive checks finish before createQrWithinQuota starts a transaction. */
export async function prepareQrCreation(args: Prisma.QrCodeUncheckedCreateInput, actor: AbuseActor, batch?: Map<string, CheckResult>) {
  if (actor.request && actor.action !== 'bulk_create') {
    const ent = await getEntitlements(args.workspaceId);
    await enforceQrRate({ request: actor.request, key: actor.actorType === 'api_key' ? args.workspaceId : actor.userId!, paid: ent.planId !== 'FREE' });
  }
  const check = args.shortCode || args.kind === 'DYNAMIC'
    ? await checkForQr(qrUrls(args), args.name, batch)
    : { verdict: 'clean' as const, reasons: [], sources: {} };
  return (tx: Prisma.TransactionClient) => createModeratedQr(tx, args, actor, check);
}
export async function createModeratedQr(tx: Prisma.TransactionClient, args: Prisma.QrCodeUncheckedCreateInput, actor: AbuseActor, check: CheckResult) {
  const qr = await tx.qrCode.create({ data: args });
  const updated = await applyModeration(tx, qr, check, actor);
  await auditQr(tx, updated, actor, actor.action ?? 'create');
  return updated;
}
export function assertQrUnchanged(snapshot: QrCode, current: QrCode) {
  // Comparing the full row also covers simultaneous changes within one timestamp millisecond.
  if (JSON.stringify(snapshot) !== JSON.stringify(current)) throw new AbuseError(MSG.ABUSE_CONFLICT, 409);
}
export async function updateModeratedQr(id: string, data: Prisma.QrCodeUncheckedUpdateInput, actor: AbuseActor, scope: { workspaceId?: string; requireActive?: boolean } = {}) {
  const db = getDb();
  const where = { id, workspaceId: scope.workspaceId, isArchived: scope.requireActive ? false as const : undefined };
  const snapshot = await db.qrCode.findFirst({ where });
  if (!snapshot) throw new AbuseError(MSG.NOT_FOUND, 404);
  const { revisions: _revisions, ...update } = data; void _revisions;
  if (typeof update.currentTargetUrl === 'string' && !update.payload) update.payload = { ...(snapshot.payload as object ?? {}), url: update.currentTargetUrl };
  const proposed = { ...snapshot, ...update } as QrCode;
  const changed = JSON.stringify(qrUrls(snapshot)) !== JSON.stringify(qrUrls(proposed)) || snapshot.name !== proposed.name;
  if (changed && snapshot.moderationStatus === 'BLOCKED') throw new AbuseError(MSG.ABUSE_BLOCKED_EDIT);
  if (changed && actor.request) {
    const ent = await getEntitlements(snapshot.workspaceId);
    await enforceQrRate({ request: actor.request, key: actor.actorType === 'api_key' ? snapshot.workspaceId : actor.userId!, qrId: id, paid: ent.planId !== 'FREE' });
  }
  const check = changed ? await checkForQr(qrUrls(proposed), proposed.name) : null;
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "QrCode" WHERE id = ${id} FOR UPDATE`;
    const before = await tx.qrCode.findFirst({ where });
    if (!before) throw new AbuseError(MSG.NOT_FOUND, 404);
    assertQrUnchanged(snapshot, before);
    if (changed) await tx.qrRevision.create({ data: { qrCodeId: id, changedById: actor.userId ?? before.createdById, destinationUrl: before.currentTargetUrl, encodedContent: before.encodedContent, payloadSnapshot: before.payload ?? undefined } });
    let qr = await tx.qrCode.update({ where, data: update });
    if (check) qr = await applyModeration(tx, qr, check, actor);
    await auditQr(tx, qr, actor, actor.action ?? (changed ? 'update_url' : 'update_settings'), before);
    return qr;
  }, { timeout: 20000 });
}
