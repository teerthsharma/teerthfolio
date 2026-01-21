import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Teerth Sharma | Systems Researcher",
  description: "Systems Researcher specializing in High-Performance Computing, hardware-aware AI optimization, and sparse attention mechanisms. Based in Jaipur, India.",
  keywords: ["Systems Engineering", "High-Performance Computing", "GPU Programming", "TensorRT", "WebGPU", "AI Optimization"],
  authors: [{ name: "Teerth Sharma" }],
  openGraph: {
    title: "Teerth Sharma | Systems Researcher",
    description: "Systems Researcher specializing in High-Performance Computing and hardware-aware AI optimization.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-black antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
