/** Neutralize CSV formula injection and quote fields for Excel/Sheets. */
export function csvEscape(value: string | number | null | undefined) {
  let raw = value == null ? "" : String(value);
  const looksLikeFormula =
    /^[\s\u00A0\u200B\uFEFF]*[=+\-@\t\r\n\v\f|]/.test(raw) || /[\u2028\u2029]/.test(raw);
  if (looksLikeFormula) raw = `'${raw}`;
  if (/[",\n\r]/.test(raw) || raw.startsWith("'")) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

export function csvRow(values: Array<string | number | null | undefined>): string {
  return values.map(csvEscape).join(",");
}
