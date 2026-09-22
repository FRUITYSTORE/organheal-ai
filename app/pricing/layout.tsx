import type { Metadata } from "next";

import JsonLd from "@/app/components/seo/JsonLd";
import { SITE_URL } from "@/lib/seo/organization";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "See OrganHeal AI plans. Start free with report uploads, health tracking, and AI questions about your own results — no card required.",
};

// Only the Free plan gets an Offer: Plus has no announced price yet, and
// listing one would be inaccurate structured data.
const productJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "OrganHeal AI",
  description:
    "A personal health analysis workspace: organize reports, understand results, and prepare for doctor visits.",
  url: `${SITE_URL}/pricing`,
  offers: {
    "@type": "Offer",
    name: "OrganHeal AI Free plan",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url: `${SITE_URL}/signup`,
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <JsonLd data={productJsonLd} />
      {children}
    </>
  );
}
