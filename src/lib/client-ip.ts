function envFlag(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === "") return fallback;
  return value === "1" || value.toLowerCase() === "true";
}

const IPV4 = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6 = /^[0-9a-f:]+$/i;

function looksLikeIp(value: string): boolean {
  if (IPV4.test(value)) {
    return value.split(".").every((part) => Number(part) <= 255);
  }
  return value.includes(":") && IPV6.test(value);
}

export function trustForwardedClientIp(): boolean {
  return envFlag(process.env.TRUST_PROXY, false);
}

/** Client IP only from forwarded headers when TRUST_PROXY is enabled. */
export function clientIpFromHeaders(headers: Headers): string | undefined {
  if (!trustForwardedClientIp()) return undefined;
  const forwarded = headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first && looksLikeIp(first)) return first;
  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp && looksLikeIp(realIp)) return realIp;
  return undefined;
}

export function getClientIp(request: Request): string {
  return clientIpFromHeaders(request.headers) ?? "unknown";
}
