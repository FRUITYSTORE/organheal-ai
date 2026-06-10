import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Navbar from "./components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://organheal.com"),

  title: {
    default: "OrganHeal AI | AI-Powered Health Intelligence",
    template: "%s | OrganHeal AI",
  },

  description:
    "OrganHeal AI helps users understand organ health, interpret lab results, track wellness patterns, and generate personalized health intelligence reports.",

  keywords: [
    "OrganHeal AI",
    "health intelligence",
    "organ health",
    "AI health platform",
    "lab result interpretation",
    "health assessment",
    "personalized health report",
  ],

  authors: [{ name: "OrganHeal AI" }],
  creator: "OrganHeal AI",
  publisher: "OrganHeal AI",

  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },

  openGraph: {
    title: "OrganHeal AI | AI-Powered Health Intelligence",
    description:
      "Understand organ health, track wellness patterns, interpret labs, and generate personalized health reports with OrganHeal AI.",
    url: "https://organheal.com",
    siteName: "OrganHeal AI",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "OrganHeal AI health intelligence platform preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "OrganHeal AI | AI-Powered Health Intelligence",
    description:
      "Understand organ health, track wellness patterns, interpret labs, and generate personalized health reports with OrganHeal AI.",
    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}