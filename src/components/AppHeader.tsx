"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/useAuth";
import { usePathname } from "next/navigation";
import { mainNavItems } from "@/components/navItems";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";

const NAV_ACTIVE =
  "inline-flex items-center gap-2 rounded-full bg-[color:var(--espresso)] px-3.5 py-2 text-[13px] font-semibold text-[color:var(--cream)] transition-all";
const NAV_IDLE =
  "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold text-[color:var(--ink-2)] transition-all hover:bg-[color:var(--cream-3)] hover:text-[color:var(--ink)]";

const NAV_ACTIVE_DARK =
  "inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-2 text-[13px] font-semibold text-white backdrop-blur transition-all";
const NAV_IDLE_DARK =
  "inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-semibold text-white/85 transition-all hover:bg-white/15 hover:text-white";

export default function AppHeader() {
  const { status, signOut } = useAuth();
  const pathname = usePathname();
  const onLogin = pathname.startsWith("/login");
  const onHome = pathname === "/";

  if (onLogin) return null;

  const navActive = onHome ? NAV_ACTIVE_DARK : NAV_ACTIVE;
  const navIdle = onHome ? NAV_IDLE_DARK : NAV_IDLE;

  return (
    <header
      className={
        onHome
          ? "absolute top-0 inset-x-0 z-30"
          : "sticky top-0 z-30 border-b border-[color:var(--line)] bg-[color:var(--cream)]/85 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--cream)]/70"
      }
    >
      {!onHome ? (
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#ff4d2e]/45 to-transparent" aria-hidden />
      ) : null}
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="shrink-0" aria-label="Meet42 — accueil">
            <Logo size={34} onDark={onHome} />
          </Link>

          {!onHome ? (
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
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle onDark={onHome} />
            {status === "authenticated" ? (
              <button
                className={
                  onHome
                    ? "rounded-full px-3.5 py-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/15"
                    : "rounded-full px-3.5 py-2 text-sm font-semibold text-[color:var(--ink-2)] transition-colors hover:bg-[color:var(--cream-3)]"
                }
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

        <nav className={onHome ? "mt-3 hidden md:flex items-center gap-1.5" : "mt-3 hidden md:flex items-center gap-1"}>
          {mainNavItems.map((it) => {
            const active = pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href));
            return (
              <Link key={it.href} href={it.href} className={active ? navActive : navIdle}>
                <span aria-hidden>{it.icon}</span>
                {it.label}
              </Link>
            );
          })}
          <Link href="/confiance" className={pathname === "/confiance" ? navActive : navIdle}>
            <span aria-hidden>🛡</span>
            Confiance
          </Link>
        </nav>
      </div>
    </header>
  );
}
