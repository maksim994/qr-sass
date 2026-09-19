import Link from "next/link";
import { QR_LIFETIME, QR_LIFETIME_PATH } from "@/lib/qr-lifetime-policy";

type Props = {
  variant: "download-dynamic" | "download-static" | "billing" | "detail-dynamic";
};

const TEXT: Record<Props["variant"], string> = {
  "download-dynamic": QR_LIFETIME.downloadDynamic,
  "download-static": QR_LIFETIME.downloadStatic,
  billing: QR_LIFETIME.billing,
  "detail-dynamic": QR_LIFETIME.downloadDynamic,
};

export function QrLifetimeNote({ variant }: Props) {
  return (
    <div className="qrs-lifetime-note">
      {TEXT[variant]}{" "}
      <Link href={QR_LIFETIME_PATH} className="qrs-navlink">
        Подробнее
      </Link>
    </div>
  );
}
