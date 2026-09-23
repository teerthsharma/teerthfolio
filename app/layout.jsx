import { Geist, Geist_Mono } from "next/font/google";
import AuroraFieldVeil from "../components/AuroraFieldVeil";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const geistDisplay = Geist({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

export const metadata = {
  title: "Teerth Sharma - Seal Topology Observatory",
  description:
    "A polar observatory portfolio for Teerth Sharma, filmed through a cinematic shader system for topology, compilers, physics, AI systems, and upstream open-source research.",
  metadataBase: new URL("https://teerthsharma.vercel.app"),
  openGraph: {
    title: "Teerth Sharma - Seal Topology Observatory",
    description:
      "Explore Teerth Sharma's polar observatory through a dark cinematic shader world: Seal OS, Aether-Lang, field physics, QPU verification, and live GitHub radar.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistDisplay.variable} ${geistMono.variable}`}
    >
      <body>
        {children}
        {/* Site-wide, so the same curtain hangs over every route rather than
            over one section. Last in the body so it composites above the
            world's canvas; the shader's own band layout is what keeps it off
            the page's text. */}
        <AuroraFieldVeil />
      </body>
    </html>
  );
}
