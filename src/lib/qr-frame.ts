import atlas from "@/lib/qr-frame-glyphs";
export const QR_FRAMES = [{ id:"none", label:"Без рамки" }, { id:"bottom", label:"Подпись снизу" }, { id:"bubble", label:"Плашка сверху" }, { id:"stand", label:"Настольная табличка" }, { id:"round", label:"Круглая рамка" }] as const;
export const FRAME_CAPTIONS = ["Сканируй меня", "Наведи камеру", "Оставь отзыв", "Меню"];
export type FrameConfig = { frameStyle?: string; frameText?: string; frameColor?: string; frameTextColor?: string };
export const frameEnabled = (s: FrameConfig) => QR_FRAMES.some(f => f.id !== "none" && f.id === s.frameStyle);
const color = (v: string | undefined, fallback: string) => v && /^#[\da-f]{6}$/i.test(v) ? v : fallback;
export function captionPaths(text: string, width: number, center: number, baseline: number, fill: string) {
  const glyphs = atlas.glyphs as Record<string, {d:string;w:number}>;
  const chars = Array.from(text).slice(0,24).map(c => glyphs[c] ?? glyphs["?"]);
  const total = chars.reduce((n,g)=>n+g.w,0);
  const scale = Math.min(width / Math.max(1,total), width / 16 / atlas.units);
  let x = center - total * scale / 2;
  return chars.map(g => { const path = `<path fill="${fill}" d="${g.d}" transform="translate(${x} ${baseline}) scale(${scale} ${-scale})"/>`; x += g.w * scale; return path; }).join("");
}
/** Frame is entirely outside the original QR, including its quiet zone. Caption glyphs are paths. */
export function withQrFrame(svg: string, s: FrameConfig, size = 1200): string {
  if (!frameEnabled(s)) return svg;
  const ink = color(s.frameColor,"#111111"), text = color(s.frameTextColor, ink);
  const round = s.frameStyle === "round", top = s.frameStyle === "bubble";
  const qrSize = size * (round ? .63 : .78), x = (size - qrSize) / 2;
  const y = size * (top ? .20 : round ? .15 : .06);
  const baseline = size * (top ? .12 : .93);
  const outline = round ? `<circle cx="${size/2}" cy="${size/2}" r="${size*.48}" fill="none" stroke="${ink}" stroke-width="${size*.008}"/>` : `<rect x="${size*.02}" y="${size*.02}" width="${size*.96}" height="${size*.96}" rx="${size*(top ? .09 : .025)}" fill="none" stroke="${ink}" stroke-width="${size*.008}"/>`;
  const stand = s.frameStyle === "stand" ? `<path d="M${size*.03} ${size*.84}H${size*.97}" stroke="${ink}" stroke-width="${size*.015}"/>` : "";
  const originalBox = svg.match(/viewBox="([^"]+)"/)?.[1] ?? `0 0 ${size} ${size}`;
  const body = svg.replace(/<\?xml[^>]*>/g,"").replace(/<svg\b[^>]*>/,"").replace(/<\/svg>\s*$/, "");
  const caption = captionPaths(s.frameText?.trim() || "Сканируй меня",size*.78,size/2,baseline,text);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="#ffffff"/>${outline}${stand}<svg x="${x}" y="${y}" width="${qrSize}" height="${qrSize}" viewBox="${originalBox}">${body}</svg>${caption}</svg>`;
}
