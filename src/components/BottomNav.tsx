"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNavItems } from "@/components/navItems";

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname.startsWith("/login")) return null;

  return (
    <nav className="md:hidden fixed inset-x-0 bottom-0 z-30 px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto flex max-w-md items-center justify-between rounded-full border border-[color:var(--line)] bg-[color:var(--cream-2)]/85 px-3 py-2 shadow-[0_14px_36px_-10px_rgba(29,22,13,0.4)] backdrop-blur-md">
        {mainNavItems.map((it) => {
          const active = pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href));

          // Bouton central surélevé : lancer une activité
          if (it.href === "/create") {
            return (
              <Link
                key={it.href}
                href={it.href}
                aria-label={it.label}
                className="meet42-pulse-glow -mt-7 grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[color:var(--fire)] text-[#fff5f1] shadow-lg shadow-[rgb(255_77_46_/_0.45)] transition-transform active:scale-95"
              >
                <span className="text-2xl leading-none" aria-hidden>
                  ＋
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[color:var(--ink)] transition-colors"
                  : "flex flex-1 flex-col items-center gap-0.5 py-1.5 text-[color:var(--ink-3)] transition-colors hover:text-[color:var(--ink)]"
              }
            >
              <span className={active ? "text-xl" : "text-xl opacity-80"} aria-hidden>
                {it.icon}
              </span>
              <span className="text-[10px] font-semibold">{it.label}</span>
              <span
                className={
                  active
                    ? "mt-0.5 h-1 w-1 rounded-full bg-[color:var(--fire)] transition-all"
                    : "mt-0.5 h-1 w-1 rounded-full bg-transparent transition-all"
                }
                aria-hidden
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
