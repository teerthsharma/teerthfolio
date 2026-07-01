import { Archivo_Black, Doto, Space_Grotesk } from "next/font/google";
import "./globals.css";

const archivo = Archivo_Black({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

const space = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const doto = Doto({
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
      className={`${archivo.variable} ${space.variable} ${doto.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
