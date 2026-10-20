/** Moscow is UTC+03 year round. datetime-local is intentionally interpreted here, never in the browser timezone. */
export function moscowInputToIso(value: string): string | null {
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value)) return null;
  const date = new Date(`${value}:00+03:00`);
  if (!Number.isFinite(date.getTime()) || formatMoscowInput(date) !== value) return null;
  return date.toISOString();
}
export function formatMoscowInput(value: Date | string | null | undefined): string {
  return value ? new Date(new Date(value).getTime() + 3 * 3600_000).toISOString().slice(0, 16) : "";
}
