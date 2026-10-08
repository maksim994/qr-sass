export type UploadOutcome = { state: "UPLOADED"; uploadId: string } | { state: "PENDING" | "REVIEW"; error: string };

/** Ambiguous outcomes are held for reconciliation, not blindly retried. */
export async function uploadMetrikaConversion(counterId: string, token: string, csv: string, paymentId: string): Promise<UploadOutcome> {
  const body = new FormData();
  body.append("file", new Blob([csv], { type: "text/csv" }), "conversion.csv");
  try {
    const response = await fetch(`https://api-metrika.yandex.net/management/v1/counter/${counterId}/offline_conversions/upload?comment=${encodeURIComponent(paymentId)}`, {
      method: "POST", headers: { Authorization: `OAuth ${token}` }, body, signal: AbortSignal.timeout(15_000),
    });
    // Explicit authorization / quota rejections are safe to retry on a later run.
    if ([401, 403, 429].includes(response.status)) return { state: "PENDING", error: `HTTP_${response.status}` };
    if (!response.ok) return { state: "REVIEW", error: `HTTP_${response.status}` };
    const data = await response.json();
    const id = data?.uploading?.id;
    if ((typeof id !== "number" && typeof id !== "string") || !/^\d+$/.test(String(id))) return { state: "REVIEW", error: "INVALID_UPLOAD_RESPONSE" };
    return { state: "UPLOADED", uploadId: String(id) };
  } catch { return { state: "REVIEW", error: "AMBIGUOUS_UPLOAD_RESULT" }; }
}

export async function readMetrikaUpload(counterId: string, token: string, uploadId: string) {
  const response = await fetch(`https://api-metrika.yandex.net/management/v1/counter/${counterId}/offline_conversions/uploading/${uploadId}`, {
    headers: { Authorization: `OAuth ${token}` }, signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  const data = await response.json();
  return data?.uploading?.status as string | undefined;
}
