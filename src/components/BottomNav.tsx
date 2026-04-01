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

    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30">

      <div className="max-w-lg mx-auto mb-2 rounded-3xl border border-zinc-200/80 bg-white/90 backdrop-blur shadow-lg grid grid-cols-4 px-1 py-1.5 gap-0.5">

        {mainNavItems.map((it) => {

          const active =

            pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href));

          return (

            <Link

              key={it.href}

              href={it.href}

              className={

                active

                  ? "flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-white bg-zinc-900 shadow-sm"

                  : "flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100/70"

              }

            >

              <div className={active ? "text-xl" : "text-xl opacity-80"} aria-hidden>

                {it.icon}

              </div>

              <div className={active ? "text-xs font-semibold" : "text-xs font-medium"}>

                {it.label}

              </div>

            </Link>

          );

        })}

      </div>

      <div className="pb-[env(safe-area-inset-bottom)]" />

    </nav>

  );

}


