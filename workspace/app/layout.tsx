import type { Metadata } from "next";
import { Arimo, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const arimo = Arimo({
  variable: "--font-arimo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "CTS Intelligence Core",
  description: "Central Trust Securities Intelligence Core",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${arimo.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-[#E0E0E0] antialiased">{children}</body>
    </html>
  );
}