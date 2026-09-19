/** Regenerate social previews after changing landing headlines: node --experimental-strip-types --import ./scripts/register-src-alias.mjs scripts/generate-landing-images.ts */
import sharp from "sharp";
import QRCode from "qrcode";
import { mkdir, writeFile } from "node:fs/promises";
import { landingDetails } from "../src/lib/landing-details.ts";
import { htmlAttr } from "../src/lib/html-script.ts";

await mkdir("public/images/landings", { recursive: true });
for (const [slug, page] of Object.entries(landingDetails)) {
  const qr = await QRCode.toString(`https://qr-s.ru/${slug}`, { type: "svg", margin: 4, color: { dark: "#20252c", light: "#ffffff" } });
  const qrBody = qr.slice(qr.indexOf(">") + 1, qr.lastIndexOf("</svg>"));
  const viewBox = qr.match(/viewBox="([^"]+)"/)![1];
  const lines = page.headline.split("\n");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#f7f9fc"/><rect x="800" width="400" height="630" fill="#e9effc"/><g font-family="Arial, sans-serif"><text x="64" y="88" fill="#2456df" font-size="30" font-weight="700">QR-S.ru</text>${lines.map((line, i) => `<text x="64" y="${260 + i * 66}" fill="#20252c" font-size="${line.length > 23 ? 43 : 50}" font-weight="700">${htmlAttr(line)}</text>`).join("")}<text x="64" y="526" fill="#4b5563" font-size="23">${htmlAttr(page.label)}</text></g><svg x="858" y="170" width="284" height="284" viewBox="${viewBox}">${qrBody}</svg></svg>`;
  await writeFile(`public/images/landings/${slug}.png`, await sharp(Buffer.from(svg)).png().toBuffer());
}
