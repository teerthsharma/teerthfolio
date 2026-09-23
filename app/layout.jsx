import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Variable fonts, so no weight list is needed. Weights used: sans
// 400/500/600/700, mono 500/800.
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata = {
  title: "Teerth Sharma — Seal's Topology Land",
  description:
    "Slide a seal around an ice island where every stop is one of Teerth Sharma's projects: eleven contributions landed upstream, a bare-metal Rust OS, a runtime whose loops stop when their shape does, and maths proved in Lean.",
  metadataBase: new URL("https://teerthfolio.vercel.app"),
  openGraph: {
    title: "Teerth Sharma — Seal's Topology Land",
    description: "A seal, an island, and every project Teerth built, each one a place to slide up to.",
    type: "website",
    siteName: "Teerth Sharma",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport = {
  themeColor: "#bcd6ee", // = --world in globals.css
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
