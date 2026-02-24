import { ImageResponse } from "next/og";

export const alt = "qr-s.ru — Генератор QR-кодов для бизнеса";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f172a",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #2563eb 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px",
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: "white",
              letterSpacing: "-0.03em",
              textAlign: "center",
            }}
          >
            qr-s.ru
          </div>
          <div
            style={{
              fontSize: 32,
              color: "rgba(255,255,255,0.9)",
              marginTop: 24,
              textAlign: "center",
            }}
          >
            Генератор QR-кодов для бизнеса
          </div>
          <div
            style={{
              fontSize: 20,
              color: "rgba(255,255,255,0.7)",
              marginTop: 16,
              textAlign: "center",
            }}
          >
            Статические и динамические QR с аналитикой и кастомизацией
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
