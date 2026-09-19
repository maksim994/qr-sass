import { MSG } from "@/lib/user-messages";
import { jsonForHtmlScript, pixelRedirectDocument } from "@/lib/html-script";

export type TrackingPixels = {
  metaPixelId?: string;
  ga4Id?: string;
  ymCounterId?: string;
  vkPixelId?: string;
};

const PATTERNS: Record<keyof TrackingPixels, RegExp> = {
  metaPixelId: /^\d{5,20}$/,
  ga4Id: /^G-[A-Z0-9]{6,20}$/,
  ymCounterId: /^\d{6,12}$/,
  vkPixelId: /^[A-Za-z0-9_-]{4,40}$/,
};

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
}

export function applyTrackingPixelsToPayload(
  payload: Record<string, unknown>,
): { ok: true; payload: Record<string, unknown> } | { ok: false; error: string } {
  if (!("trackingPixels" in payload)) {
    return { ok: true, payload };
  }
  const sanitized = sanitizeTrackingPixels(payload.trackingPixels);
  if (!sanitized.ok) return sanitized;
  const next = { ...payload };
  if (!sanitized.value) delete next.trackingPixels;
  else next.trackingPixels = sanitized.value;
  return { ok: true, payload: next };
}

export function sanitizeTrackingPixels(
  raw: unknown,
): { ok: true; value?: TrackingPixels } | { ok: false; error: string } {
  const src = asRecord(raw);
  const value: TrackingPixels = {};
  for (const key of Object.keys(PATTERNS) as (keyof TrackingPixels)[]) {
    const provided = src[key];
    if (provided == null || provided === "") continue;
    if (typeof provided !== "string") {
      return { ok: false, error: MSG.INVALID_TRACKING_PIXEL };
    }
    const trimmed = provided.trim();
    if (!trimmed) continue;
    if (!PATTERNS[key].test(trimmed)) {
      return { ok: false, error: MSG.INVALID_TRACKING_PIXEL };
    }
    value[key] = trimmed;
  }

  return Object.keys(value).length > 0 ? { ok: true, value } : { ok: true, value: undefined };
}

/** Build redirect interstitial scripts from already-sanitized IDs. Values are HTML-safe JSON. */
export function trackingPixelsHtml(pixels: TrackingPixels, targetUrl: string): string {
  const parts: string[] = [];

  if (pixels.metaPixelId) {
    const id = jsonForHtmlScript(pixels.metaPixelId);
    parts.push(
      `<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${id});fbq('track','PageView');</script>`,
    );
  }
  if (pixels.ga4Id) {
    const id = jsonForHtmlScript(pixels.ga4Id);
    const idAttr = encodeURIComponent(pixels.ga4Id);
    parts.push(
      `<script async src="https://www.googletagmanager.com/gtag/js?id=${idAttr}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${id});</script>`,
    );
  }
  if (pixels.ymCounterId) {
    const id = jsonForHtmlScript(pixels.ymCounterId);
    const watch = encodeURIComponent(pixels.ymCounterId);
    parts.push(
      `<script>(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();k=e.createElement(t),a=e.getElementsByTagName(t)[0];k.async=1;k.src=r;a.parentNode.insertBefore(k,a)})(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");ym(${id},"init",{clickmap:true,webvisor:true});</script><noscript><div><img src="https://mc.yandex.ru/watch/${watch}" style="position:absolute;left:-9999px;" alt="" /></div></noscript>`,
    );
  }
  if (pixels.vkPixelId) {
    const id = jsonForHtmlScript(pixels.vkPixelId);
    parts.push(
      `<div id="vk_api_transport"></div><script>window.vkAsyncInit=function(){try{var p=new VK.Pixel(${id});p.Hit();}catch(e){}};(function(){var s=document.createElement("script");s.src="https://vk.com/js/api/openapi.js?169";s.async=true;(document.getElementById("vk_api_transport")||document.head).appendChild(s);})();</script>`,
    );
  }

  return pixelRedirectDocument(targetUrl, parts.join(""));
}

