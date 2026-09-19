export const MAX_BULK_BYTES = 1_048_576;

export type DeclaredLengthCheck =
  | { ok: true; declared: number }
  | { ok: false; status: 411 | 413; message: string };

export function inspectDeclaredContentLength(
  header: string | null,
  maxBytes = MAX_BULK_BYTES,
): DeclaredLengthCheck {
  if (header == null || header.trim() === "") {
    return {
      ok: false,
      status: 411,
      message: "Укажите размер файла (Content-Length). Максимум 1 МБ.",
    };
  }
  const declared = Number(header);
  if (!Number.isFinite(declared) || declared <= 0) {
    return {
      ok: false,
      status: 411,
      message: "Укажите размер файла (Content-Length). Максимум 1 МБ.",
    };
  }
  if (declared > maxBytes) {
    return { ok: false, status: 413, message: "Файл слишком большой. Максимум 1 МБ." };
  }
  return { ok: true, declared };
}

export class BodyTooLargeError extends Error {
  status = 413 as const;
  constructor(message = "Файл слишком большой. Максимум 1 МБ.") {
    super(message);
    this.name = "BodyTooLargeError";
  }
}

export async function readRequestBodyCapped(
  request: Request,
  maxBytes = MAX_BULK_BYTES,
): Promise<Uint8Array> {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        throw new BodyTooLargeError();
      }
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}

export async function formDataWithinLimit(
  request: Request,
  maxBytes = MAX_BULK_BYTES,
): Promise<FormData> {
  const declared = inspectDeclaredContentLength(request.headers.get("content-length"), maxBytes);
  if (!declared.ok) {
    const error = new Error(declared.message) as Error & { status: 411 | 413 };
    error.status = declared.status;
    throw error;
  }
  const body = await readRequestBodyCapped(request, maxBytes);
  const contentType = request.headers.get("content-type");
  if (!contentType) {
    const error = new Error("Некорректный multipart.") as Error & { status: 400 };
    error.status = 400;
    throw error;
  }
  return new Request("http://bulk.invalid", {
    method: "POST",
    headers: { "content-type": contentType },
    body: Buffer.from(body),
  }).formData();
}
