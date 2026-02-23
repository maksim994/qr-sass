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

export async function readJsonBody<T = unknown>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
