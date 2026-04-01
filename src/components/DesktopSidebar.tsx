"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNavItems } from "@/components/navItems";

export default function DesktopSidebar() {
  const pathname = usePathname();
  if (pathname.startsWith("/login")) return null;

  return (
    <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:z-30 md:w-64 md:border-r md:border-zinc-200/80 md:bg-zinc-50/90 md:backdrop-blur">
      <div className="px-5 py-5 border-b border-zinc-200/80">
        <Link href="/" className="font-extrabold text-xl tracking-tight text-zinc-900">
          Meet42
        </Link>
        <p className="text-xs text-zinc-500 mt-1">Plans à 4–6 · IRL premium</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1.5">
        {mainNavItems.map((it) => {
          const active =
            pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href));
          return (
            <Link
              key={it.href}
              href={it.href}
              className={
                active
                  ? "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold bg-zinc-900 text-white shadow-sm"
                  : "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium text-zinc-600 hover:bg-white hover:shadow-sm hover:text-zinc-900"
              }
            >
              <span className="text-lg" aria-hidden>
                {it.icon}
              </span>
              {it.label}
            </Link>
          );
        })}
        <div className="px-3 pt-4 mt-4 border-t border-zinc-200 space-y-1.5">
          <Link
            href="/tarifs"
            className={
              pathname === "/tarifs"
                ? "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold bg-amber-100 text-amber-950"
                : "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium text-zinc-600 hover:bg-white hover:text-zinc-900"
            }
          >
            <span className="text-lg" aria-hidden>
              ✦
            </span>
            Tarifs & Pro
          </Link>
          <Link
            href="/confiance"
            className={
              pathname === "/confiance"
                ? "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold bg-zinc-900 text-white"
                : "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium text-zinc-600 hover:bg-white hover:text-zinc-900"
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
