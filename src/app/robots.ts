import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://meet42.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // API privée + portail d'accès + pages personnelles sans intérêt SEO
        disallow: ["/api/", "/gate", "/admin", "/mes-plans", "/profile"],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
