import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata = {
  title: "Teerth Sharma — Seal's Topology Land",
  description:
    "Slide a seal around an ice island where every building is one of Teerth Sharma's projects: a Rust microkernel, a topological ML runtime, quantum verification, and eleven contributions landed upstream.",
  metadataBase: new URL("https://teerthfolio.vercel.app"),
  openGraph: {
    title: "Teerth Sharma — Seal's Topology Land",
    description: "A seal, an island, eight buildings. Each one is something Teerth built.",
  },
};

export const viewport = {
  themeColor: "#bcd6ee",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
