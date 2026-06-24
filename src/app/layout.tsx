import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/useAuth";
import AppShell from "@/components/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display éditoriale — serif à fort caractère (titres, hero, cartes)
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://meet42.app"),
  title: { default: "Meet42 — petits groupes, vraies rencontres", template: "%s · Meet42" },
  description:
    "Rejoins des activités IRL en petits groupes (4–6) près de toi. Café, apéro, marche — sans friction. Gratuit pour participer.",
  manifest: "/manifest.webmanifest",
  applicationName: "Meet42",
  keywords: ["Meet42", "Bruxelles", "Ixelles", "IRL", "rencontre", "apéro", "sortie", "groupe"],
  openGraph: {
    type: "website",
    locale: "fr_BE",
    siteName: "Meet42",
    title: "Meet42 — Meet people. Do something. Simple.",
    description: "Plans réels à 4–6 personnes près de toi. Connexion rapide, groupes humains.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meet42",
    description: "Petits groupes, activités IRL près de toi.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Meet42",
  },
  icons: {
    icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.svg", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#111111",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Meet42",
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "EUR",
    description: "Création et participation aux plans IRL",
  },
  description:
    "Application de plans IRL en petits groupes à Bruxelles, Ixelles et alentours — café, apéro, marche, sans swipe.",
} as const;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem('meet42-theme')==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <a href="#contenu-principal" className="skip-link">
          Aller au contenu
        </a>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
