import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-zinc-500">404</p>
      <h1 className="mt-2 text-2xl font-bold text-zinc-900">Page introuvable</h1>
      <p className="mt-2 max-w-md text-sm text-zinc-600">
        Ce lien n’existe pas ou a été déplacé. Retourne à l’accueil pour voir les plans autour de toi.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Accueil
        </Link>
        <Link
          href="/mes-plans"
          className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
        >
          Mes plans
        </Link>
        <Link
          href="/create"
          className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-50"
        >
          Créer un plan
        </Link>
      </div>
    </main>
  );
}
