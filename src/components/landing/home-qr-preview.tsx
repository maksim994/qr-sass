import QRCode from "qrcode";
import { MSG } from "@/lib/user-messages";

/** Real QR modules, including a four-module quiet zone, for the landing preview. */
export function HomeQrPreview({ value, className }: { value: string; className?: string }) {
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
  return (
      <svg className={className} viewBox={`0 0 ${modules.size + 8} ${modules.size + 8}`} role="img" aria-label="Предпросмотр QR-кода" shapeRendering="crispEdges">
        <rect width="100%" height="100%" fill="#fff" />
        <path d={paths.join("")} fill="#20252c" />
      </svg>
  );
}
