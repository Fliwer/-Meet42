"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNavItems } from "@/components/navItems";

export default function BottomNav() {
  const pathname = usePathname();
  const hidden = pathname.startsWith("/login");

  if (hidden) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 px-4 pb-2">
      <div className="max-w-md mx-auto rounded-full border border-[color:var(--line)] bg-[color:var(--cream-2)]/90 backdrop-blur-md shadow-[0_12px_40px_rgba(29,22,13,0.15)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.4)] grid grid-cols-5 items-center px-2 py-1.5 relative">
        {mainNavItems.map((it) => {
          const active =
            pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href));
          
          const isCreate = it.href === "/create";

          if (isCreate) {
            return (
              <div key={it.href} className="flex justify-center relative -translate-y-3.5">
                <Link
                  href={it.href}
                  className="w-14 h-14 rounded-full bg-[color:var(--fire)] hover:bg-[color:var(--fire-2)] active:scale-95 transition-all duration-300 flex items-center justify-center shadow-[0_8px_20px_rgba(255,77,46,0.4)] meet42-pulse-glow"
                  aria-label={it.label}
                >
                  <span className="text-white text-3xl font-light -mt-1" aria-hidden>＋</span>
                </Link>
              </div>
            );
          }

          return (
            <Link
              key={it.href}
              href={it.href}
              className="flex flex-col items-center justify-center gap-0.5 py-1 text-center transition-all duration-300 relative group"
            >
              <span 
                className={`text-xl transition-transform duration-300 group-hover:-translate-y-0.5 ${
                  active ? "text-[color:var(--fire)] scale-110" : "text-[color:var(--ink-2)] opacity-80 group-hover:opacity-100"
                }`} 
                aria-hidden
              >
                {it.icon}
              </span>
              <span 
                className={`text-[10px] font-semibold transition-colors duration-300 ${
                  active ? "text-[color:var(--fire)]" : "text-[color:var(--ink-3)] group-hover:text-[color:var(--ink)]"
                }`}
              >
                {it.label}
              </span>
              <span
                className={`mt-0.5 h-1 w-1 rounded-full transition-all duration-300 ${
                  active ? "bg-[color:var(--fire)] scale-110" : "bg-transparent scale-0"
                }`}
                aria-hidden
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
