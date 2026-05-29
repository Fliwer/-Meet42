import React from "react";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import ConditionalFooter from "@/components/ConditionalFooter";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <div id="contenu-principal" className="flex-1 flex flex-col pb-20 md:pb-8 outline-none" tabIndex={-1}>
        {children}
        <ConditionalFooter />
      </div>
      <BottomNav />
    </div>
  );
}
