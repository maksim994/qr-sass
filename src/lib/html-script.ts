/** JSON for embedding inside an HTML <script> body. JSON.stringify alone is not enough: a string containing </script> closes the tag. */
export function jsonForHtmlScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function htmlAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/'/g, "&#39;");
}

/** Pixel interstitial shell. Extra head HTML must already be safe. */
export function pixelRedirectDocument(targetUrl: string, extraHead = "") {
  const escapedUrl = htmlAttr(targetUrl);
  const locLiteral = jsonForHtmlScript(targetUrl);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex, nofollow"><meta http-equiv="refresh" content="0;url=${escapedUrl}">${extraHead}</head><body><p>Перенаправление...</p><script>setTimeout(function(){location.replace(${locLiteral});},150);</script></body></html>`;
}
