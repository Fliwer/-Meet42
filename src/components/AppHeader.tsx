"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/useAuth";
import { usePathname } from "next/navigation";
import { mainNavItems } from "@/components/navItems";
import Logo from "@/components/Logo";

const NAV_ACTIVE =
  "inline-flex items-center gap-2 rounded-full bg-[color:var(--espresso)] px-4 py-2 text-sm font-semibold text-[color:var(--cream)] shadow-sm";
const NAV_IDLE =
  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-[color:var(--ink-2)] transition-colors hover:bg-[color:var(--cream-3)]";

export default function AppHeader() {
  const { status, signOut } = useAuth();
  const pathname = usePathname();
  const onLogin = pathname.startsWith("/login");

  if (onLogin) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--line)] bg-[color:var(--cream)]/85 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--cream)]/70">
      {/* Hairline feu très discrète en haut */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#ff4d2e]/45 to-transparent" aria-hidden />
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="shrink-0" aria-label="Meet42 — accueil">
            <Logo size={34} />
          </Link>

          <div className="hidden md:flex items-center flex-1 gap-2">
            <button
              type="button"
              className="group flex items-center gap-2.5 rounded-full border border-[color:var(--line)] bg-[color:var(--cream-2)] px-4 py-2.5 text-sm text-[color:var(--ink-3)] w-full max-w-md transition-colors hover:border-[#ff4d2e]/40 hover:bg-[color:var(--cream-2)]"
            >
              <span className="text-[color:var(--fire)]" aria-hidden>
                🔎
              </span>
              <span>Explorer des activités près de Bruxelles</span>
            </button>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--line)] bg-[color:var(--cream-3)] px-3 py-2 text-xs font-bold text-[color:var(--ink)]">
              <span aria-hidden>📍</span> Bruxelles, BE
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {status === "authenticated" ? (
              <button
                className="rounded-full px-3.5 py-2 text-sm font-semibold text-[color:var(--ink-2)] transition-colors hover:bg-[color:var(--cream-3)]"
                onClick={() => signOut()}
                type="button"
              >
                Déconnexion
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-[color:var(--fire)] px-5 py-2.5 text-sm font-bold text-[#fff5f1] shadow-md shadow-[rgb(255_77_46_/_0.3)] transition hover:bg-[color:var(--fire-2)] active:scale-[0.99]"
              >
                Connexion
              </Link>
            )}
          </div>
        </div>

        <nav className="mt-3 hidden md:flex items-center gap-1">
          {mainNavItems.map((it) => {
            const active = pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href));
            return (
              <Link key={it.href} href={it.href} className={active ? NAV_ACTIVE : NAV_IDLE}>
                <span aria-hidden>{it.icon}</span>
                {it.label}
              </Link>
            );
          })}
          <Link href="/confiance" className={pathname === "/confiance" ? NAV_ACTIVE : NAV_IDLE}>
            <span aria-hidden>🛡</span>
            Confiance
          </Link>
        </nav>
      </div>
    </header>
  );
}
