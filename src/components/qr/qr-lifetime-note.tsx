import { PRINTED_QR_COPY } from "@/lib/commercial-config";
import Link from "next/link";
import { QR_LIFETIME, QR_LIFETIME_PATH } from "@/lib/qr-lifetime-policy";

type Props = {
  variant: "download-dynamic" | "download-static" | "billing" | "detail-dynamic";
};

const TEXT: Record<Props["variant"], string> = {
  "download-dynamic": PRINTED_QR_COPY,
  "download-static": QR_LIFETIME.downloadStatic,
  billing: PRINTED_QR_COPY,
  "detail-dynamic": PRINTED_QR_COPY,
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
