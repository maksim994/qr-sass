/** Decode payloads as data only. Never resolve, fetch or navigate a scanned URL. */
export type ScanResult = {
  type: "URL" | "TEXT" | "WIFI" | "VCARD";
  raw: string;
  url?: string;
  domain?: string;
  warnings: string[];
  wifi?: { ssid: string; encryption: string; password: string; hidden: boolean };
  contact?: { name: string; phones: string[]; emails: string[] };
};

function unescapeValue(value: string) {
  return value.replace(/\\([\\;,:"])/g, "$1").replace(/\\n/gi, "\n");
}

function wifiFields(text: string) {
  // Split only unescaped separators; SSIDs/passwords can contain ; : and backslashes.
  const fields: Record<string, string> = {};
  const parts = text.match(/(?:\\.|[^;])+/g) ?? [];
  for (const part of parts) {
    const separator = part.indexOf(":");
    if (separator > 0) fields[part.slice(0, separator)] = unescapeValue(part.slice(separator + 1));
  }
  return fields;
}

export function parseScanResult(raw: string): ScanResult {
  const base: ScanResult = { type: "TEXT", raw, warnings: [] };
  const value = raw.trim();
  if (/^WIFI:/i.test(value)) {
    const fields = wifiFields(value.slice(5));
    if (fields.S) return { ...base, type: "WIFI", wifi: {
      ssid: fields.S, encryption: fields.T || "nopass", password: fields.P || "", hidden: fields.H === "true",
    } };
  }
  if (/^BEGIN:VCARD\r?\n/i.test(value) && /\r?\nEND:VCARD$/i.test(value)) {
    const lines = value.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
    let name = "";
    let fallbackName = "";
    const phones: string[] = [];
    const emails: string[] = [];
    for (const line of lines) {
      const separator = line.indexOf(":");
      if (separator < 0) continue;
      const key = line.slice(0, separator).split(";")[0].split(".").pop()?.toUpperCase();
      const field = unescapeValue(line.slice(separator + 1));
      if (key === "FN") name = field;
      if (key === "N") fallbackName = field.split(";").filter(Boolean).join(" ");
      if (key === "TEL") phones.push(field.replace(/^tel:/i, ""));
      if (key === "EMAIL") emails.push(field.replace(/^mailto:/i, ""));
    }
    return { ...base, type: "VCARD", contact: { name: name || fallbackName, phones, emails } };
  }
  // Only literal HTTP(S) addresses become links. Other schemes remain inert text.
  if (/^https?:\/\//i.test(value) && !/[\u0000-\u0020\u007f]/.test(value)) {
    try {
      const url = new URL(value);
      if (!url.hostname) return base;
      const warnings: string[] = [];
      if (url.protocol !== "https:") warnings.push("Соединение по HTTP не зашифровано.");
      if (url.hostname.includes("xn--")) warnings.push("Домен содержит международные символы. Сверьте его с адресом нужного сайта.");
      if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(url.hostname) || url.hostname.startsWith("[")) warnings.push("В ссылке указан IP-адрес вместо имени сайта.");
      if (url.username || url.password) warnings.push("Ссылка содержит логин или пароль. Переход отключён; проверьте исходный адрес.");
      return { ...base, type: "URL", domain: url.hostname, url: url.username || url.password ? undefined : url.href, warnings };
    } catch { return base; }
  }
  return base;
}
