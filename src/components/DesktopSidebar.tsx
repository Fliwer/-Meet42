"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNavItems } from "@/components/navItems";

export default function DesktopSidebar() {
  const pathname = usePathname();
  if (pathname.startsWith("/login")) return null;

  return (
    <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:z-30 md:w-72 md:border-r md:border-zinc-200/80 md:bg-white">
      <div className="px-6 py-6 border-b border-zinc-200/80">
        <Link href="/" className="font-extrabold text-xl tracking-tight text-zinc-900 inline-flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
          Meet42
        </Link>
        <p className="text-xs text-zinc-500 mt-1">Activités locales • 4 à 6 participants</p>
      </div>
      <nav className="flex-1 px-4 py-5 space-y-1.5">
        {mainNavItems.map((it) => {
          const active =
            pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href));
          return (
            <Link
              key={it.href}
              href={it.href}
              className={
                active
                  ? "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold bg-zinc-900 text-white shadow-sm"
                  : "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              }
            >
              <span className="text-lg" aria-hidden>
                {it.icon}
              </span>
              {it.label}
            </Link>
          );
        })}
        <div className="px-1 pt-4 mt-4 border-t border-zinc-200 space-y-1.5">
          <Link
            href="/confiance"
            className={
              pathname === "/confiance"
                ? "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold bg-zinc-900 text-white"
                : "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            }
          >
            <span className="text-lg" aria-hidden>
              🛡
            </span>
            Confiance
          </Link>
        </div>
      </nav>
    </aside>
  );
}
