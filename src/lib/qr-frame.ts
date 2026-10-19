import atlas from "@/lib/qr-frame-glyphs";
import oswald from "@/lib/qr-frame-oswald";
export const MODERN_QR_FRAMES = [{id:"none",label:"Без рамки"},{id:"tag",label:"Плашка"},{id:"ribbon",label:"Лента"},{id:"sticker",label:"Наклейка"},{id:"ticket",label:"Билет"},{id:"phone",label:"Телефон"},{id:"hand",label:"В руке"},{id:"wifi",label:"Wi-Fi"}] as const;
export const QR_FRAMES = [...MODERN_QR_FRAMES, { id:"bottom", label:"Подпись снизу" }, { id:"bubble", label:"Плашка сверху" }, { id:"stand", label:"Настольная табличка" }, { id:"round", label:"Круглая рамка" }] as const;
export const FRAME_CAPTIONS = ["Сканируйте код", "Наведите камеру", "Оставьте отзыв", "Меню", "Wi-Fi для гостей"];
export type FrameConfig = { frameStyle?: string; frameText?: string; frameColor?: string; frameTextColor?: string };
export const frameEnabled = (s: FrameConfig) => QR_FRAMES.some(f => f.id !== "none" && f.id === s.frameStyle);
const color = (v: string | undefined, fallback: string) => v && /^#[\da-f]{6}$/i.test(v) ? v : fallback;
/** The caption sits on the frame color in the new filled templates. */
export function framePalette(s: FrameConfig) {
  const ink=color(s.frameColor,"#111111");
  const filled=MODERN_QR_FRAMES.some(f=>f.id!=="none"&&f.id===s.frameStyle);
  const rgb=[1,3,5].map(i=>parseInt(ink.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  const luminance=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
  return {ink,text:color(s.frameTextColor,filled?(luminance>.179?"#111111":"#ffffff"):ink),background:filled?ink:"#ffffff"};
}
export function captionPaths(text: string, width: number, center: number, baseline: number, fill: string, typeMeasure = 16) {
  const glyphs = atlas.glyphs as Record<string, {d:string;w:number}>;
  const chars = Array.from(text).slice(0,24).map(c => glyphs[c] ?? glyphs["?"]);
  const total = chars.reduce((n,g)=>n+g.w,0);
  const scale = Math.min(width / Math.max(1,total), width / typeMeasure / atlas.units);
  let x = center - total * scale / 2;
  return chars.map(g => { const path = `<path fill="${fill}" d="${g.d}" transform="translate(${x} ${baseline}) scale(${scale} ${-scale})"/>`; x += g.w * scale; return path; }).join("");
}

const captionTracking = oswald.units * .035;
const captionGlyphs = (text: string) => Array.from(text).map(c => oswald.glyphs[c] ?? oswald.glyphs["?"]);
const captionAdvance = (text: string) => {
  const glyphs = captionGlyphs(text);
  return glyphs.reduce((total, glyph) => total + glyph.w, 0) + Math.max(0, glyphs.length - 1) * captionTracking;
};

/** Fit by visible glyph bounds, so Cyrillic capitals stay large and accents stay inside the plate. */
function boldCaption(text: string, width: number, center: number, middle: number, height: number, fill: string) {
  const glyphs = captionGlyphs(text);
  const boxes = glyphs.flatMap(g => g.box ? [g.box] : []);
  if (!boxes.length) return "";
  const min = Math.min(...boxes.map(b => b[1])), max = Math.max(...boxes.map(b => b[3]));
  const total = captionAdvance(text);
  const scale = Math.min(width / Math.max(1, total), height / Math.max(1, max - min));
  const baseline = middle + (min + max) * scale / 2;
  let x = center - total * scale / 2;
  return glyphs.map(g => {
    const path = `<path fill="${fill}" d="${g.d}" transform="translate(${x} ${baseline}) scale(${scale} ${-scale})"/>`;
    x += (g.w + captionTracking) * scale;
    return path;
  }).join("");
}

/** Compact phone footers balance words across two lines instead of shrinking the whole caption. */
function captionLines(text: string, compact: boolean) {
  const normalized = Array.from(text.trim()).slice(0, 24).join("").toUpperCase().replace(/\s+/g, " ");
  const words = normalized.split(" ");
  if (!compact || words.length < 2) return [normalized];
  let best = [normalized], measure = Infinity;
  for (let i = 1; i < words.length; i++) {
    const lines = [words.slice(0, i).join(" "), words.slice(i).join(" ")];
    const candidate = Math.max(...lines.map(captionAdvance));
    if (candidate < measure) { best = lines; measure = candidate; }
  }
  return best;
}
/** Frame is entirely outside the original QR, including its quiet zone. Caption glyphs are paths. */
export function withQrFrame(svg: string, s: FrameConfig, size = 1200): string {
  if (!frameEnabled(s)) return svg;
  if (MODERN_QR_FRAMES.some(f=>f.id!=="none"&&f.id===s.frameStyle)) return modernFrame(svg,s,size);
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

/** Original QR and its quiet zone are nested intact; decoration never covers the QR window. */
function modernFrame(svg:string,s:FrameConfig,size:number){
  const {ink,text}=framePalette(s);
  const originalBox=svg.match(/viewBox="([^"]+)"/)?.[1]??`0 0 ${size} ${size}`;
  const body=svg.replace(/<\?xml[^>]*>/g,"").replace(/<svg\b[^>]*>/,"").replace(/<\/svg>\s*$/,"");
  let x=12,y=6,w=76,center=50,middle=89,captionWidth=70,captionHeight=8,lineGap=0;
  let decoration="";
  const whiteWindow=(wx:number,wy:number,ww:number,wh=ww,rx=2)=>`<rect x="${wx}" y="${wy}" width="${ww}" height="${wh}" rx="${rx}" fill="#ffffff"/>`;
  switch(s.frameStyle){
    case "tag":
      decoration=`<path d="M10 2H90Q94 2 94 6V98L50 92L6 98V6Q6 2 10 2Z" fill="${ink}"/>${whiteWindow(10,6,80,72)}`;x=14;w=72;middle=85;captionWidth=76;captionHeight=9.5;break;
    case "ribbon":
      decoration=`<rect x="12" y="2" width="76" height="76" rx="4" fill="${ink}"/>${whiteWindow(15,5,70)}<path d="M0 76H16V96H0L7 86ZM84 76H100L93 86L100 96H84Z" fill="${ink}"/><rect x="8" y="75" width="84" height="22" fill="${ink}"/>`;x=15;y=5;w=70;middle=86;captionWidth=75;captionHeight=10;break;
    case "sticker":
      decoration=`<path d="M12 2H88Q92 2 92 6V83L77 98H12Q8 98 8 94V6Q8 2 12 2Z" fill="${ink}"/>${whiteWindow(12,6,76)}<path d="M79 97V86Q79 84 82 84H91" fill="#ffffff" stroke="${ink}" stroke-width="1"/>`;center=45;captionWidth=61;middle=89;break;
    case "ticket":
      decoration=`<path d="M12 2H88Q92 2 92 6V94L88 99L84 94L80 99L76 94L72 99L68 94L64 99L60 94L56 99L52 94L48 99L44 94L40 99L36 94L32 99L28 94L24 99L20 94L16 99L12 94L8 99V6Q8 2 12 2Z" fill="${ink}"/>${whiteWindow(12,6,76)}`;middle=88.5;captionHeight=8.5;break;
    case "phone":
      decoration=`<rect x="19" y="1" width="62" height="98" rx="10" fill="${ink}"/>${whiteWindow(23,6,54,69,6)}<rect x="38" y="5" width="24" height="5" rx="2.5" fill="${ink}"/>`;x=23;y=17;w=54;captionWidth=48;middle=87;captionHeight=7;lineGap=10;break;
    case "hand":
      decoration=`<path d="M25 36C12 30 10 43 20 49C7 46 7 59 20 63C8 62 10 74 23 77L58 88L72 88L84 100L100 84L92 76L94 62Q95 56 90 50L80 35Q76 30 72 34L69 38L76 50L78 66" fill="#ffffff" stroke="${ink}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><rect x="19" y="1" width="60" height="87" rx="8" fill="${ink}"/>${whiteWindow(23,6,52,65,4)}<rect x="38" y="4" width="22" height="4" rx="2" fill="${ink}"/>`;x=23;y=17;w=52;center=49;middle=79;captionWidth=48;captionHeight=5.5;lineGap=7;break;
    case "wifi":
      decoration=`<rect x="8" y="2" width="84" height="96" rx="5" fill="${ink}"/>${whiteWindow(12,6,76)}<g stroke="${text}" stroke-width="1.7" fill="none" stroke-linecap="round"><path d="M17 87Q23 81 29 87M20 90Q23 87 26 90"/><circle cx="23" cy="93" r=".9" fill="${text}" stroke="none"/></g>`;center=59;captionWidth=52;middle=89;break;
  }
  const lines=captionLines(s.frameText?.trim()||"Сканируйте код",lineGap>0);
  const caption=lines.map((line,i)=>boldCaption(line,captionWidth,center,middle+(i-(lines.length-1)/2)*lineGap,captionHeight,text)).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${size}" height="${size}" viewBox="0 0 100 100"><rect width="100" height="100" fill="#ffffff"/>${decoration}<svg x="${x}" y="${y}" width="${w}" height="${w}" viewBox="${originalBox}">${body}</svg>${caption}</svg>`;
}
