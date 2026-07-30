import { ImageResponse } from "next/og";
import { getPlanForMeta, formatStartFr } from "@/lib/plans/getPlanForMeta";

/**
 * Image OpenGraph d'un plan, la carte vue quand un lien /plan/xxx est partagé
 * (bouton « Inviter un pote »). Aucune info personnelle : activité, moment,
 * coin, places restantes.
 */

export const alt = "Un plan Meet42 t'attend";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await getPlanForMeta(id);

  const emoji = plan?.activityEmoji ?? "✨";
  const label = plan?.activityLabel ?? "Une sortie";
  const when = plan ? formatStartFr(plan.start_time) : "";
  const spotsLeft = plan ? Math.max(0, plan.max_participants - plan.participants_count) : null;
  const place = plan?.location_text ?? "Bruxelles";

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
          padding: "56px 64px",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* Header : wordmark + badge live */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: "#1d160d" }}>
            Meet<span style={{ color: "#ff4d2e" }}>42</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              backgroundColor: "#1d160d",
              color: "#f3ebdd",
              borderRadius: 999,
              padding: "10px 24px",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            <div style={{ width: 12, height: 12, borderRadius: 999, backgroundColor: "#22c55e" }} />
            Plan réel · Bruxelles
          </div>
        </div>

        {/* Corps : activité */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", fontSize: 72 }}>{emoji}</div>
          <div style={{ fontSize: 84, fontWeight: 700, color: "#1d160d", lineHeight: 1.05, letterSpacing: -2 }}>
            {label}
          </div>
          <div style={{ display: "flex", fontSize: 34, color: "#5b4f3f" }}>
            {when ? `${when} · ` : ""}
            {place.length > 52 ? `${place.slice(0, 52)}…` : place}
          </div>
        </div>

        {/* Footline : urgence douce + CTA */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#1d160d" }}>
            {spotsLeft === null
              ? "Groupe de 4 à 6, rejoins-les"
              : spotsLeft <= 0
                ? "Groupe complet, d'autres plans t'attendent"
                : `${spotsLeft} ${spotsLeft > 1 ? "places restantes" : "place restante"} sur ${plan?.max_participants}`}
          </div>
          <div
            style={{
              display: "flex",
              backgroundColor: "#ff4d2e",
              color: "#fff7f0",
              borderRadius: 999,
              padding: "16px 36px",
              fontSize: 30,
              fontWeight: 700,
            }}
          >
            Rejoindre →
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
