"use client";

import React from "react";
import EnviePanel from "@/components/EnviePanel";

/**
 * Onglet « Ton 42 » — la page dédiée pour dire son envie et se faire former
 * un groupe. Réutilise le même EnviePanel que le home (un seul code, le vrai
 * matcher partout). Plus de sélecteur dupliqué ni de copie « bientôt ».
 */
export default function MatchPage() {
  return (
    <main className="min-h-screen bg-transparent px-4 pb-32">
      <div className="mx-auto max-w-2xl py-6 md:py-9">
        <EnviePanel />
      </div>
    </main>
  );
}
