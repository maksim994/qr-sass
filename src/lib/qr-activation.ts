/** Static activation needs a successful download; managed activation also needs an external open of the same QR. */
export function activatedWorkspaces(
  events: { workspaceId: string; qrCodeId: string | null; name: string }[],
  qrs: { id: string; kind: string; shortCode: string | null }[],
) {
  const managed = new Map(qrs.map(qr => [qr.id, qr.kind === "DYNAMIC" || Boolean(qr.shortCode)]));
  const groups = new Map<string, { workspaceId: string; names: Set<string> }>();
  for (const event of events) {
    if (!event.qrCodeId || !managed.has(event.qrCodeId)) continue;
    const key = `${event.workspaceId}:${event.qrCodeId}`;
    const group = groups.get(key) ?? { workspaceId: event.workspaceId, names: new Set<string>() };
    group.names.add(event.name); groups.set(key, group);
  }
  const active = new Set<string>(), staticDownloaded = new Set<string>();
  for (const [key, group] of groups) {
    const qrId = key.slice(key.indexOf(":") + 1);
    if (!group.names.has("qr_created") || !group.names.has("qr_downloaded")) continue;
    if (!managed.get(qrId)) { active.add(group.workspaceId); staticDownloaded.add(group.workspaceId); }
    else if (group.names.has("first_external_open")) active.add(group.workspaceId);
  }
  return { active, staticDownloaded };
}
