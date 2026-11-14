import { Instrument_Sans, JetBrains_Mono, Shantell_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { PROFILE, SITE_URL } from "../lib/world/places";

// Not imported from lib/world/analytics: that pulls the client-only store into the server layout.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

// Variable fonts, so no weight list is needed. Weights used: sans
// 400/500/600/700, mono 500/800.
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
// The comic lettering of the cutscenes' bubbles (ui/Bubbles.jsx): its
// bounce and informal axes give hand lettering in mixed case. Not preloaded:
// it is first needed seconds into a walk.
const comic = Shantell_Sans({ subsets: ["latin"], variable: "--font-comic", display: "swap", axes: ["BNCE", "INFM"], preload: false });

export const metadata = {
  title: { default: "Teerth Sharma — Seal's Topology Land", template: "%s — Teerth Sharma" },
  description:
    "Slide a seal around an ice island where every stop is one of Teerth Sharma's projects: fourteen contributions landed upstream, a bare-metal Rust OS, a runtime whose loops stop when their shape does, and maths proved in Lean.",
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Teerth Sharma — Seal's Topology Land",
    description: "A seal, an island, and every project Teerth built, each one a place to slide up to.",
    url: "/",
    type: "website",
    siteName: "Teerth Sharma",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
  authors: [{ name: PROFILE.name, url: SITE_URL }],
};

export const viewport = {
  themeColor: "#bcd6ee", // = --world in globals.css
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${comic.variable}`}>
      {GA_ID && (
        <head>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config',${JSON.stringify(GA_ID)});`,
            }}
          />
        </head>
      )}
      <body>
        {children}
        <Script
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "2a4259bb84734fe6ad6ecff564c4a27a"}'
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
