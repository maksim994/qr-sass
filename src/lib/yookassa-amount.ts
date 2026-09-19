/** Local orders store whole rubles. Reject fractional provider amounts. */
export function parseYookassaAmountRub(value: string | null | undefined): number | null {
  const raw = String(value ?? "").trim();
  if (!/^\d+\.\d{2}$/.test(raw) && !/^\d+$/.test(raw)) return null;
  const [rubles, fraction = "00"] = raw.includes(".") ? raw.split(".") : [raw, "00"];
  if (fraction !== "00") return null;
  const amount = Number(rubles);
  if (!Number.isInteger(amount) || amount <= 0) return null;
  return amount;
}

export function metadataString(
  metadata: Record<string, string> | undefined,
  key: string,
): string | null {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
