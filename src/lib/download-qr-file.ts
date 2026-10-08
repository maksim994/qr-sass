import { MSG } from "@/lib/user-messages";

/** Resolve only after the file was received and handed to the browser. */
export async function downloadQrFile(href: string) {
  const response = await fetch(href, { credentials: "same-origin" });
  if (!response.ok || response.redirected) throw new Error(MSG.COULD_NOT_DOWNLOAD);
  const blob = await response.blob();
  if (!blob.size || blob.type.includes("json") || blob.type.includes("text/html")) throw new Error(MSG.COULD_NOT_DOWNLOAD);
  const disposition = response.headers.get("content-disposition");
  const match = disposition?.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
  let filename = "qr-code";
  if (match?.[1]) {
    try { filename = decodeURIComponent(match[1]).replace(/["']/g, ""); } catch { /* Use safe default. */ }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  try { link.click(); } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
