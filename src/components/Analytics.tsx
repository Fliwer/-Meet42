"use client";

import { useEffect } from "react";
import { initAnalytics } from "@/lib/analytics";

/** Monte l'analytics au premier rendu client (no-op sans clé PostHog). */
export default function Analytics() {
  useEffect(() => {
    initAnalytics();
  }, []);
  return null;
}
