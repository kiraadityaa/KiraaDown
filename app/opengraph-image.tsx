import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Kartu pratinjau tautan 1200x630 untuk WhatsApp, Telegram, X, dan lainnya.
// Murni tipografi di atas warna merek, tanpa tangkapan layar palsu.
export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "#0d0f0c",
          padding: "72px 80px",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: 24,
                background: "#a3e635",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 56,
                fontWeight: 800,
                color: "#1a2e05",
              }}
            >
              K
            </div>
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 26,
                letterSpacing: 6,
                color: "#a3e635",
              }}
            >
              RP0 / $0
            </div>
          </div>
          <div
            style={{
              marginTop: 32,
              fontSize: 104,
              fontWeight: 800,
              letterSpacing: -4,
              color: "#eef2e4",
              lineHeight: 1,
            }}
          >
            KiraaDown
          </div>
          <div style={{ marginTop: 20, fontSize: 38, color: "#a3e635" }}>
            Video tanpa watermark, foto, dan MP3 TikTok
          </div>
          <div
            style={{
              marginTop: 36,
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontFamily: "monospace",
              fontSize: 24,
              letterSpacing: 2,
              color: "#9aa38f",
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                background: "#65a30d",
              }}
            />
            TEMPEL LINK : PRATINJAU : UNDUH
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
