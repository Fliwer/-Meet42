import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.14em] text-[color:var(--fire-ink)]">404</p>
      <h1 className="font-display mt-2 text-3xl font-semibold tracking-[-0.02em] text-[color:var(--ink)]">
        Cette page a raté le rendez-vous
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[color:var(--ink-2)]">
        Ce lien n’existe pas ou a été déplacé. Retourne à l’accueil pour voir les plans autour de toi.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="meet42-cta-primary">
          Accueil
        </Link>
        <Link
          href="/mes-plans"
          className="rounded-2xl border border-[color:var(--line-2)] bg-[color:var(--cream-2)] px-5 py-3 text-sm font-semibold text-[color:var(--ink)] hover:bg-[color:var(--cream-3)]"
        >
          Mes plans
        </Link>
        <Link
          href="/create"
          className="rounded-2xl border border-[color:var(--line-2)] bg-[color:var(--cream-2)] px-5 py-3 text-sm font-semibold text-[color:var(--ink)] hover:bg-[color:var(--cream-3)]"
        >
          Créer un plan
        </Link>
      </div>
    </main>
  );
}
