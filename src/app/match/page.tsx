"use client";

import React from "react";
import RitualsSection from "@/components/RitualsSection";

/**
 * Onglet « Ton 42 » — réserver sa place sur les rituels de la semaine.
 * Même composant que le home : un seul code, le vrai moteur partout.
 */
export default function MatchPage() {
  return (
    <main className="min-h-screen bg-transparent px-4 pb-32">
      <div className="mx-auto max-w-3xl py-6 md:py-9">
        <RitualsSection />
      </div>
    </main>
  );
}
