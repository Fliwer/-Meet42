"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/useAuth";
import { usePathname } from "next/navigation";
import { mainNavItems } from "@/components/navItems";

export default function AppHeader() {
  const { status, signOut } = useAuth();
  const pathname = usePathname();
  const onLogin = pathname.startsWith("/login");

  if (onLogin) return null;

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="shrink-0 font-extrabold text-zinc-900 tracking-tight inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden />
            <span className="text-2xl leading-none">Meet42</span>
          </Link>
          <div className="hidden md:flex items-center flex-1 gap-2">
            <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm text-zinc-600 w-full max-w-md">
              <span aria-hidden>🔎</span>
              <span>Explorer des activités près de Bruxelles</span>
            </div>
            <span className="rounded-full bg-zinc-900 text-white px-3 py-1.5 text-xs font-semibold">Bruxelles, BE</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {status === "authenticated" ? (
              <button
                className="rounded-full px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                onClick={() => signOut()}
                type="button"
              >
                Déconnexion
              </button>
            ) : (
              <Link href="/login" className="rounded-full px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900">
                Connexion
              </Link>
            )}
          </div>
        </div>
        <nav className="mt-3 hidden md:flex items-center gap-1.5">
          {mainNavItems.map((it) => {
            const active = pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href));
            return (
              <Link
                key={it.href}
                href={it.href}
                className={
                  active
                    ? "inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                    : "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
                }
              >
                <span aria-hidden>{it.icon}</span>
                {it.label}
              </Link>
            );
          })}
          <Link
            href="/confiance"
            className={
              pathname === "/confiance"
                ? "inline-flex items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                : "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
            }
          >
            <span aria-hidden>🛡</span>
            Confiance
          </Link>
        </nav>
      </div>
    </header>
  );
}

