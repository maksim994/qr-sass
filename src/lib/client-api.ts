export function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(^|;)\s*csrf_token\s*=\s*([^;]+)/);
  return match ? match[2] : null;
}

export async function fetchApi(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  
  // Add CSRF token for mutating requests
  const method = init?.method?.toUpperCase() || "GET";
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const token = getCsrfToken();
    if (token) {
      headers.set("X-CSRF-Token", token);
    }
  }

  return fetch(input, { ...init, headers });
}

type ParsedApiResponse<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  code: string | null;
};

export async function parseApiResponse<T>(response: Response): Promise<ParsedApiResponse<T>> {
  const text = await response.text();
  let parsed: unknown = null;

  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  const objectBody =
    parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null;

  const wrappedData =
    objectBody && "ok" in objectBody
      ? ((objectBody.data as T | undefined) ?? null)
      : ((parsed as T | null) ?? null);

  const errorMessage =
    objectBody && typeof objectBody.error === "string"
      ? objectBody.error
      : response.ok
        ? null
        : "Unexpected server response.";

  const code =
    objectBody && typeof objectBody.code === "string"
      ? objectBody.code
      : null;

  return {
    ok: response.ok,
    status: response.status,
    data: wrappedData,
    error: errorMessage,
    code,
  };
}
