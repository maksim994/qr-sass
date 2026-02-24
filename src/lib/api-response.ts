import { NextResponse } from "next/server";

type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "CONFIG_ERROR"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR";

export type ApiErrorBody = {
  ok: false;
  error: string;
  code: ErrorCode;
  details?: unknown;
  requestId?: string;
};

export type ApiSuccessBody<T> = {
  ok: true;
  data: T;
  requestId?: string;
};

export function getRequestId(request: Request) {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}

export function apiSuccess<T>(data: T, status = 200, requestId?: string) {
  return NextResponse.json<ApiSuccessBody<T>>(
    { ok: true, data, requestId },
    { status },
  );
}

export function apiError(
  error: string,
  code: ErrorCode,
  status: number,
  details?: unknown,
  requestId?: string,
) {
  return NextResponse.json<ApiErrorBody>(
    {
      ok: false,
      error,
      code,
      details,
      requestId,
    },
    { status },
  );
}

const MAX_JSON_BODY_BYTES = 1024 * 1024; // 1 MB

async function readBodyWithLimit(request: Request, maxBytes: number): Promise<string | null> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (!Number.isNaN(size) && size > maxBytes) return null;
  }

  const reader = request.body?.getReader();
  if (!reader) return null;

  const chunks: Uint8Array[] = [];
  let total = 0;
  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > maxBytes) {
        reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    return chunks.map((c) => decoder.decode(c)).join("");
  } catch {
    return null;
  }
}

export async function readJsonBody<T = unknown>(request: Request): Promise<T | null> {
  try {
    const raw = await readBodyWithLimit(request, MAX_JSON_BODY_BYTES);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
