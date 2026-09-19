/** Dirty editor must not download a persisted QR that no longer matches preview. */
export function savedQrIdForDownload(qrId: string | undefined, dirty: boolean): string | undefined {
  if (!qrId || dirty) return undefined;
  return qrId;
}
