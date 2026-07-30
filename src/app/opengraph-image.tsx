import { ImageResponse } from "next/og";

/**
 * Image OpenGraph par défaut, c'est la carte qu'on voit quand meet42.app est
 * partagé (WhatsApp, Insta, iMessage…). Style éditorial cream/ink/fire.
 */

export const alt = "Meet42, Rencontre du monde. Fais quelque chose.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#f3ebdd",
          padding: "64px 72px",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              backgroundColor: "#ff4d2e",
            }}
          />
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, color: "#1d160d" }}>
            Meet<span style={{ color: "#ff4d2e" }}>42</span>
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, fontWeight: 700, color: "#1d160d", lineHeight: 1.02, letterSpacing: -3 }}>
            Rencontre du monde.
          </div>
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              fontStyle: "italic",
              color: "#ff4d2e",
              lineHeight: 1.02,
              letterSpacing: -3,
            }}
          >
            Fais quelque chose.
          </div>
        </div>

        {/* Footline */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 32, color: "#5b4f3f" }}>
            Des sorties à 4–6 près de toi. Sans swipe.
          </div>
          <div
            style={{
              display: "flex",
              backgroundColor: "#1d160d",
              color: "#f3ebdd",
              borderRadius: 999,
              padding: "14px 32px",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            Bruxelles
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
