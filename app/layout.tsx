import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kala Prospek",
  description: "Dashboard Prospek Klien, Kalender, & Rate Card",
  manifest: "/manifest.json",
  themeColor: "#FFE8EC",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Kala Prospek",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" href="https://placehold.co/192x192/FFE8EC/D65A75?text=KP" />
      </head>
      <body className="min-h-full flex flex-col bg-[#FFFDF9]">{children}</body>
    </html>
  );
}