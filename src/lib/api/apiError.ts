/** Erreurs API homogènes côté client (réseau vs HTTP vs parsing). */

export const API_MESSAGES = {
  network:
    "Impossible de contacter le serveur. Vérifie ta connexion ou réessaie dans un instant.",
  parse: "Réponse serveur inattendue.",
} as const;

export class ApiError extends Error {
  readonly kind: "network" | "http" | "unknown";

  constructor(message: string, kind: ApiError["kind"] = "http") {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
  }
}

function isTypeErrorFetchFailure(e: unknown): boolean {
  return e instanceof TypeError;
}

/** Erreurs réseau / DNS / TLS côté runtime (hors ApiError). */
export function isLikelyNetworkFailure(e: unknown): boolean {
  if (e instanceof ApiError && e.kind === "network") return true;
  if (isTypeErrorFetchFailure(e)) return true;
  const msg = e instanceof Error ? e.message : String(e);
  if (/failed to fetch|load failed|networkerror|network request failed|échec/i.test(msg)) return true;
  return false;
}

type JsonErrorBody = {
  error?:
    | string
    | {
        formErrors?: string[];
        fieldErrors?: Record<string, string[] | undefined>;
      };
};

/** Extrait un message lisible depuis le corps JSON d’une réponse d’erreur. */
export async function parseApiErrorBody(res: Response, fallback: string): Promise<string> {
  const raw = await res.text();
  try {
    const j = JSON.parse(raw) as JsonErrorBody;
    if (typeof j?.error === "string" && j.error.trim()) return j.error.trim();

    if (j?.error && typeof j.error === "object") {
      const fe = j.error;
      const formErr = Array.isArray(fe.formErrors) ? fe.formErrors.find((x) => typeof x === "string" && x.trim()) : undefined;
      if (formErr) return formErr.trim();
      const fieldVals = fe.fieldErrors ? Object.values(fe.fieldErrors).flat() : [];
      const first = fieldVals.find((x): x is string => typeof x === "string" && x.trim().length > 0);
      if (first) return first.trim();
    }
  } catch {
    /* ignore */
  }
  const t = raw.trim();
  if (t) return t.length > 220 ? `${t.slice(0, 220)}…` : t;
  if (res.status === 401) return "Session expirée ou non authentifié.";
  if (res.status === 403) return "Accès refusé.";
  if (res.status === 404) return "Ressource introuvable.";
  if (res.status >= 500) return "Erreur serveur. Réessaie plus tard.";
  return fallback;
}

/** fetch qui transforme les échecs réseau en ApiError réseau. */
export async function fetchWithNetworkHandling(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (e) {
    if (isLikelyNetworkFailure(e)) {
      throw new ApiError(API_MESSAGES.network, "network");
    }
    throw e;
  }
}
