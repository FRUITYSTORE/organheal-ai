import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import type { ReactNode } from "react";
import "./globals.css";
import "./theme-palette.css";

import JsonLd from "./components/seo/JsonLd";
import Navbar from "./components/Navbar";
import HealthTickerBar from "./components/home/HealthTickerBar";
import RouteAccessGuard from "./components/RouteAccessGuard";
import SiteFooter from "./components/SiteFooter";
import { themeInitScript } from "./components/theme/theme-init-script";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/organization";

// Only loads in a production deployment with the measurement ID configured,
// so local development and preview builds never send traffic into the real
// GA4 property.
const googleAnalyticsId =
  process.env.NODE_ENV === "production"
    ? process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    : undefined;

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.organheal.com"),

  title: {
    default: "OrganHeal AI | AI-Powered Health Analysis",
    template: "%s | OrganHeal AI",
  },

  description:
    "OrganHeal AI helps users understand organ health, interpret lab results, track wellness patterns, and generate personalized health analysis reports.",

  keywords: [
    "OrganHeal AI",
    "health analysis",
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
    title: "OrganHeal AI | AI-Powered Health Analysis",
    description:
      "Understand organ health, track wellness patterns, interpret labs, and generate personalized health reports with OrganHeal AI.",
    url: "https://www.organheal.com",
    siteName: "OrganHeal AI",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "OrganHeal AI health analysis platform preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "OrganHeal AI | AI-Powered Health Analysis",
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
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="light"
      className={geistSans.variable}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <JsonLd data={organizationJsonLd} />
        <JsonLd data={websiteJsonLd} />
      </head>
      <body>
        <Navbar />
        <HealthTickerBar />
        <RouteAccessGuard>{children}</RouteAccessGuard>
        <SiteFooter />
      </body>
      {googleAnalyticsId && <GoogleAnalytics gaId={googleAnalyticsId} />}
    </html>
  );
}


