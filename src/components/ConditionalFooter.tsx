"use client";

import { usePathname } from "next/navigation";
import MarketingFooter from "@/components/MarketingFooter";

export default function ConditionalFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/login")) return null;
  return <MarketingFooter />;
}
