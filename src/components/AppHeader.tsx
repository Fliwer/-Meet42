"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/useAuth";
import { usePathname } from "next/navigation";

export default function AppHeader() {
  const { status, profileStatus, profile, signOut } = useAuth();
  const pathname = usePathname();
  const onLogin = pathname.startsWith("/login");

  if (onLogin) return null;

  return (
    <header className="sticky top-0 z-20 bg-zinc-50/85 backdrop-blur supports-[backdrop-filter]:bg-zinc-50/75 border-b border-zinc-200/80">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between md:justify-end">
        <Link href="/" className="font-extrabold text-zinc-900 md:hidden tracking-tight">
          Meet42
        </Link>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
          <Link
            href="/tarifs"
            className="hidden sm:inline rounded-full bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-950 hover:bg-amber-200"
          >
            Tarifs
          </Link>
          <Link href="/mes-plans" className="hidden sm:inline text-sm font-semibold text-zinc-900 hover:text-zinc-700">
            Mes plans
          </Link>
          <Link
            href="/create"
            className="rounded-full bg-zinc-900 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Créer
          </Link>
          <Link href="/profile" className="text-sm font-semibold text-zinc-900 hover:text-zinc-700">
            Profil
          </Link>
          {status === "authenticated" ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-sm text-zinc-700">
                {profileStatus === "ready" ? profile?.first_name : "Profil"}
              </span>
              <button
                className="text-sm font-semibold text-zinc-900 hover:text-zinc-700"
                onClick={() => signOut()}
                type="button"
              >
                Déconnexion
              </button>
            </div>
          ) : (
            <Link href="/login" className="text-sm font-semibold text-zinc-900 hover:text-zinc-700">
              Connexion
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

