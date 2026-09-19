import http from "node:http";
import https from "node:https";
import dnsPromises from "node:dns/promises";
import type { LookupFunction } from "node:net";
import { isBlockedHostname, isSafeUrl } from "@/lib/url";

export type PinnedAddress = { address: string; family: 4 | 6 };

export async function resolvePublicHttpUrl(url: string): Promise<{ parsed: URL; pins: PinnedAddress[] }> {
  if (!isSafeUrl(url)) {
    throw new Error("Недопустимый адрес логотипа.");
  }
  const parsed = new URL(url);
  if (isBlockedHostname(parsed.hostname)) {
    throw new Error("Недопустимый адрес логотипа.");
  }
  let records: Array<{ address: string; family: number }>;
  try {
    records = await dnsPromises.lookup(parsed.hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("Недопустимый адрес логотипа.");
  }
  const pins = records
    .map((row) => ({ address: row.address, family: (row.family === 6 ? 6 : 4) as 4 | 6 }))
    .filter((row) => !isBlockedHostname(row.address));
  if (pins.length === 0) {
    throw new Error("Недопустимый адрес логотипа.");
  }
  return { parsed, pins };
}

export function pinnedLookup(pins: PinnedAddress[]): LookupFunction {
  const primary = pins[0];
  return ((
    _hostname: string,
    options: unknown,
    callback?: (...args: never[]) => void,
  ) => {
    const cb = (typeof options === "function" ? options : callback) as (
      err: NodeJS.ErrnoException | null,
      address: string | Array<{ address: string; family: number }>,
      family?: number,
    ) => void;
    const all = typeof options === "object" && options !== null && (options as { all?: boolean }).all;
    if (all) {
      cb(
        null,
        pins.map((pin) => ({ address: pin.address, family: pin.family })),
      );
      return;
    }
    cb(null, primary.address, primary.family);
  }) as LookupFunction;
}

const LOGO_MAX_BYTES = 1_048_576;

/**
 * Resolve once, then connect only to those verified addresses.
 * Hostname is kept for Host / TLS SNI. dns.lookup is not consulted again.
 */
export async function fetchPinnedHttp(url: string, signal: AbortSignal, maxBytes = LOGO_MAX_BYTES): Promise<Response> {
  const { parsed, pins } = await resolvePublicHttpUrl(url);
  const lib = parsed.protocol === "https:" ? https : http;
  const port = parsed.port ? Number(parsed.port) : parsed.protocol === "https:" ? 443 : 80;
  const pin = pins[0];

  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (error?: Error, response?: Response) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      if (error) reject(error);
      else resolve(response as Response);
    };
    const onAbort = () => {
      req.destroy();
      settle(new Error("timeout"));
    };

    const req = lib.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        servername: parsed.hostname,
        port,
        path: `${parsed.pathname}${parsed.search}`,
        method: "GET",
        family: pin.family,
        headers: { Host: parsed.host, Accept: "image/*" },
        lookup: pinnedLookup(pins),
      },
      (res) => {
        try {
          const status = res.statusCode ?? 500;
          if (status >= 300 && status < 400) {
            res.resume();
            req.destroy();
            settle(new Error("Недопустимый адрес логотипа."));
            return;
          }
          if (status < 200 || status >= 300 || status === 204 || status === 205) {
            res.resume();
            req.destroy();
            settle(new Error("Не удалось загрузить логотип."));
            return;
          }
          const declared = Number(res.headers["content-length"] ?? "");
          if (Number.isFinite(declared) && declared > maxBytes) {
            res.resume();
            req.destroy();
            settle(new Error("Логотип слишком большой."));
            return;
          }
          const chunks: Buffer[] = [];
          let total = 0;
          res.on("data", (chunk: Buffer) => {
            total += chunk.length;
            if (total > maxBytes) {
              req.destroy();
              settle(new Error("Логотип слишком большой."));
            }
            chunks.push(chunk);
          });
          res.on("error", (error) => {
            req.destroy();
            settle(error instanceof Error ? error : new Error(String(error)));
          });
          res.on("end", () => {
            try {
              if (status === 204 || status === 205 || status === 304) {
                req.destroy();
                settle(new Error("Не удалось загрузить логотип."));
                return;
              }
              const headers = new Headers();
              for (const [key, value] of Object.entries(res.headers)) {
                if (typeof value === "string") headers.set(key, value);
                else if (Array.isArray(value)) headers.set(key, value.join(", "));
              }
              const body = Buffer.concat(chunks);
              settle(undefined, new Response(body.byteLength > 0 ? body : null, { status, headers }));
            } catch (error) {
              req.destroy();
              settle(error instanceof Error ? error : new Error(String(error)));
            }
          });
        } catch (error) {
          req.destroy();
          settle(error instanceof Error ? error : new Error(String(error)));
        }
      },
    );
    req.on("error", (error) => settle(error instanceof Error ? error : new Error(String(error))));
    req.on("socket", (socket) => {
      socket.on("error", (error) => settle(error instanceof Error ? error : new Error(String(error))));
    });
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
    req.end();
  });
}

export async function hostnameResolvesToBlockedAddress(hostname: string): Promise<boolean> {
  if (isBlockedHostname(hostname)) return true;
  try {
    const records = await dnsPromises.lookup(hostname, { all: true, verbatim: true });
    return records.some((row) => isBlockedHostname(row.address));
  } catch {
    return true;
  }
}

export async function assertSafePublicHttpUrl(url: string): Promise<URL> {
  const { parsed } = await resolvePublicHttpUrl(url);
  return parsed;
}
