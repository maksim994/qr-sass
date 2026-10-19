import { captionPaths } from "@/lib/qr-frame";
/** A6 portrait, with a 60 mm QR including the renderer's original quiet zone. */
export function qrA6Svg(qrSvg:string) {
  const candidate=qrSvg.match(/\bviewBox="([^"]+)"/)?.[1] ?? "0 0 1200 1200";
  const viewBox=/^[\d. +e-]+$/.test(candidate)?candidate:"0 0 1200 1200";
  const inner=qrSvg.replace(/^[\s\S]*?<svg\b[^>]*>/," ").replace(/<\/svg>\s*$/," ");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="105mm" height="148mm" viewBox="0 0 105 148"><rect width="105" height="148" fill="#ffffff"/>${captionPaths("Оставьте отзыв",84,52.5,28,"#111111")}<svg x="22.5" y="42" width="60" height="60" viewBox="${viewBox}">${inner}</svg>${captionPaths("Наведите камеру",70,52.5,118,"#111111")}${captionPaths("qr-s.ru",45,52.5,136,"#111111")}</svg>`;
}
