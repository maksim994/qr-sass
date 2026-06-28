export type VcardPayload = Record<string, unknown>;

function s(payload: VcardPayload, key: string): string {
  return typeof payload[key] === "string" ? (payload[key] as string).trim() : "";
}

function escapeVcardValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = rest.slice(75);
  }
  parts.push(rest);
  return parts.map((part, index) => (index === 0 ? part : ` ${part}`)).join("\r\n");
}

export function buildVcard(payload: VcardPayload): string {
  const firstName = s(payload, "firstName");
  const lastName = s(payload, "lastName");
  const fullName = `${firstName} ${lastName}`.trim() || s(payload, "name") || "Contact";

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeVcardValue(lastName)};${escapeVcardValue(firstName)};;;`,
    `FN:${escapeVcardValue(fullName)}`,
    s(payload, "organization") ? `ORG:${escapeVcardValue(s(payload, "organization"))}` : "",
    s(payload, "title") ? `TITLE:${escapeVcardValue(s(payload, "title"))}` : "",
    s(payload, "phone") ? `TEL;TYPE=CELL:${escapeVcardValue(s(payload, "phone"))}` : "",
    s(payload, "email") ? `EMAIL:${escapeVcardValue(s(payload, "email"))}` : "",
    s(payload, "website") ? `URL:${escapeVcardValue(s(payload, "website"))}` : "",
    s(payload, "address") ? `ADR;TYPE=WORK:;;${escapeVcardValue(s(payload, "address"))};;;;` : "",
    "END:VCARD",
  ].filter(Boolean);

  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

export function getVcardFilename(payload: VcardPayload, fallback = "contact"): string {
  const firstName = s(payload, "firstName");
  const lastName = s(payload, "lastName");
  const name = `${firstName} ${lastName}`.trim() || s(payload, "name") || fallback;
  return name.replace(/[^\p{L}\p{N}_.-]+/gu, "_").replace(/^_+|_+$/g, "") || fallback;
}
