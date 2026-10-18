import { withQrFrame, frameEnabled, type FrameConfig } from "@/lib/qr-frame";
import QRCode from "qrcode";
import { MSG } from "@/lib/user-messages";

/** Real QR modules, including a four-module quiet zone, for the landing preview. */
export function HomeQrPreview({ value, className, foreground = "#20252c", background = "#fff", frame = {} }: { value: string; className?: string; foreground?: string; background?: string; frame?: FrameConfig }) {
  let modules: ReturnType<typeof QRCode.create>["modules"] | null = null;
  try {
    modules = QRCode.create(value, { errorCorrectionLevel: "M" }).modules;
  } catch {
    // Extremely long multibyte input may exceed QR capacity.
  }
  if (!modules) return <p role="status">{MSG.COULD_NOT_ENCODE_PAYLOAD}</p>;
  const paths: string[] = [];
  for (let y = 0; y < modules.size; y++) {
    for (let x = 0; x < modules.size; x++) {
      if (modules.get(y, x)) paths.push(`M${x + 4} ${y + 4}h1v1h-1z`);
    }
  }
  if (frameEnabled(frame)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${modules.size+8} ${modules.size+8}"><rect width="100%" height="100%" fill="${/^#[0-9a-f]{3,6}$/i.test(background) ? background : "#ffffff"}"/><path d="${paths.join("")}" fill="${/^#[0-9a-f]{3,6}$/i.test(foreground) ? foreground : "#111111"}"/></svg>`;
    return <div className={className} role="img" aria-label="Предпросмотр QR с рамкой" dangerouslySetInnerHTML={{__html:withQrFrame(svg,frame,1200)}}/>;
  }
  return (
      <svg className={className} viewBox={`0 0 ${modules.size + 8} ${modules.size + 8}`} role="img" aria-label="Предпросмотр QR-кода" shapeRendering="crispEdges">
        <rect width="100%" height="100%" fill={background} />
        <path d={paths.join("")} fill={foreground} />
      </svg>
  );
}
