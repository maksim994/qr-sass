const RESERVED_EMAIL_DOMAINS = new Set(["telegram.local"]);

export function isReservedAuthEmail(email: string) {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return RESERVED_EMAIL_DOMAINS.has(domain);
}
