import Papa from "papaparse";
import { isSafeUrl } from "@/lib/url";
import { MSG } from "@/lib/user-messages";

export type BulkPreview = {
  rows: { name: string; url: string }[];
  issues: { record: number; message: string }[];
  total: number;
};
export function previewBulkCsv(text: string): BulkPreview {
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  const rows: BulkPreview["rows"] = [];
  const issues: BulkPreview["issues"] = parsed.errors.filter(error => error.code !== "UndetectableDelimiter").map(error => ({ record: (error.row ?? 0) + 1, message: MSG.BULK_CSV_STRUCTURE }));
  const normalize = (key: string) => key.trim().toLowerCase().replace(/\s+/g, "_");
  const headers = parsed.meta.fields?.map(normalize) ?? [];
  if (!headers.some(key => ["url", "url_link", "link"].includes(key))) {
    return { rows, issues: [{ record: 0, message: MSG.BULK_URL_COLUMN }], total: parsed.data.length };
  }
  if (parsed.data.length === 0) issues.push({ record: 0, message: MSG.EMPTY_SPREADSHEET });
  parsed.data.forEach((raw, index) => {
    const item: Record<string, string> = {};
    Object.entries(raw).forEach(([key,value]) => { if (value != null) item[normalize(key)] = String(value).trim(); });
    const url = item.url || item.url_link || item.link;
    if (!url || !isSafeUrl(url)) { issues.push({ record: index + 1, message: MSG.BULK_ROW_URL }); return; }
    const target = new URL(url);
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
      if (item[key]) target.searchParams.set(key, item[key]);
    }
    rows.push({ name: (item.name || item.title || item.label || `QR ${index + 1}`).slice(0,120), url: target.toString() });
  });
  return { rows, issues, total: parsed.data.length };
}
