/**
 * Templates e-mail Meet42, la voix du 42 : le pote bruxellois qui organise.
 * HTML simple, inline, palette cream/ink/fire. Chaque e-mail est un moment
 * du voyage émotionnel, pas une notification système.
 */

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://meet42.app";

function shell(inner: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f3ebdd;">
<div style="max-width:520px;margin:0 auto;padding:32px 20px;font-family:Georgia,'Times New Roman',serif;color:#1d160d;">
  <div style="font-size:22px;font-weight:bold;margin-bottom:24px;">Meet<span style="color:#ff4d2e;">42</span></div>
  ${inner}
  <p style="margin-top:36px;font-size:12px;color:#8a7a64;font-family:Arial,sans-serif;">
    Meet42 · des groupes de 4-6, en vrai, à Bruxelles.<br/>
    Tu peux annuler ta place jusqu'à la veille midi depuis <a href="${SITE}" style="color:#8a7a64;">meet42.app</a>.
  </p>
</div></body></html>`;
}

const h1 = (t: string) => `<h1 style="font-size:28px;line-height:1.15;margin:0 0 12px;">${t}</h1>`;
const p = (t: string) => `<p style="font-size:16px;line-height:1.55;margin:0 0 14px;">${t}</p>`;
const cta = (label: string, href: string) =>
  `<a href="${href}" style="display:inline-block;background:#ff4d2e;color:#fff5f1;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold;font-size:15px;padding:13px 26px;border-radius:12px;margin:8px 0 4px;">${label}</a>`;
const card = (inner: string) =>
  `<div style="background:#fbf6ec;border:1px solid #e6dcc8;border-radius:14px;padding:16px 18px;margin:16px 0;">${inner}</div>`;

export function emailReserved(params: { firstName: string; ritualLabel: string; whenLabel: string }) {
  return {
    subject: `C'est noté ${params.firstName}, ton 42 se prépare`,
    html: shell(
      h1("C'est noté.") +
        p(`Ta place pour <strong>${params.ritualLabel}</strong> (${params.whenLabel}) est réservée. On s'occupe de tout : le groupe, le lieu, l'étincelle.`) +
        p(`La veille à midi, tu découvres ton groupe, c'est le Reveal. D'ici là, on te tient au courant.`) +
        p(`Un empêchement ? Tu peux libérer ta place jusqu'à la veille midi, ça ne pose aucun souci.`)
    ),
  };
}

export function emailReveal(params: {
  firstName: string;
  ritualLabel: string;
  whenLabel: string;
  venueName: string;
  memberNames: string[];
  commonPoints: string[];
  icebreakers: string[];
  planUrl: string;
}) {
  const names = params.memberNames.filter((n) => n && n !== params.firstName);
  const commons =
    params.commonPoints.length > 0
      ? card(
          `<div style="font-family:Arial,sans-serif;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#c2410c;margin-bottom:8px;">Vos points communs</div>` +
            params.commonPoints.map((c) => `<div style="font-size:15px;margin:4px 0;">• ${c}</div>`).join("")
        )
      : "";
  const ice =
    params.icebreakers.length > 0
      ? card(
          `<div style="font-family:Arial,sans-serif;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#c2410c;margin-bottom:8px;">Brise-glace</div>` +
            params.icebreakers.map((c) => `<div style="font-size:15px;margin:4px 0;">• ${c}</div>`).join("")
        )
      : "";
  return {
    subject: `Ça y est ${params.firstName}, voici ton 42 🔥`,
    html: shell(
      h1("Ça y est. Voici ton 42.") +
        p(`${params.ritualLabel}, ${params.whenLabel}.`) +
        p(`Autour de la table : <strong>${names.join(", ")}</strong>, et toi.`) +
        card(`<div style="font-size:16px;"><strong>📍 ${params.venueName}</strong></div>`) +
        commons +
        ice +
        cta("Voir mon groupe", params.planUrl) +
        p(`<span style="font-size:14px;color:#5b4f3f;">Petit conseil de pro : arrive 5 minutes en avance, dis que tu es « du 42 », et laisse faire.</span>`)
    ),
  };
}

export function emailReminder(params: { firstName: string; venueName: string; timeLabel: string; planUrl: string }) {
  return {
    subject: `C'est ce soir ${params.firstName}, ils t'attendent`,
    html: shell(
      h1("C'est aujourd'hui.") +
        p(`Ton 42, c'est à <strong>${params.timeLabel}</strong>, <strong>${params.venueName}</strong>.`) +
        p(`Ton groupe compte sur toi. Si tu es en retard de quelques minutes, pas de panique : préviens-les depuis la page du groupe.`) +
        cta("J'y serai", params.planUrl)
    ),
  };
}

export function emailPost42(params: { firstName: string; planUrl: string }) {
  return {
    subject: `Alors, ton 42 ?`,
    html: shell(
      h1("Alors, c'était comment ?") +
        p(`Sois honnête, on ne dira rien.`) +
        p(`Et surtout : <strong>une belle rencontre hier soir ?</strong> Garde les personnes que tu aimerais recroiser, si c'est réciproque, on fera en sorte que vos chemins se recroisent. Personne ne le voit, c'est entre toi et nous.`) +
        cta("Une belle rencontre ?", params.planUrl)
    ),
  };
}

export function emailPostponed(params: { firstName: string; ritualLabel: string; nextWhenLabel: string }) {
  return {
    subject: `On décale ton 42, pas assez de monde cette fois`,
    html: shell(
      h1("On est pas encore assez.") +
        p(`Pas assez de réservations pour <strong>${params.ritualLabel}</strong> cette semaine, ça arrive au début, Bruxelles se réveille doucement.`) +
        p(`Ta place est automatiquement reportée à <strong>${params.nextWhenLabel}</strong>. Tu n'as rien à faire.`) +
        p(`Un coup de pouce ? Amène un ami : plus on est, plus vite les groupes s'allument.`) +
        cta("Voir mon 42", SITE)
    ),
  };
}
