export const SITE_URL = "https://www.organheal.com";

/**
 * The Organization entity referenced site-wide (root layout) and as the
 * `publisher` of Article structured data. Kept generic (Organization, not
 * MedicalOrganization/MedicalBusiness) because OrganHeal AI is an
 * educational tool, not a licensed healthcare provider — see the medical
 * disclaimer.
 */
export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "OrganHeal AI",
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  description:
    "OrganHeal AI helps users understand organ health, interpret lab results, track wellness patterns, and generate personalized health analysis reports.",
};

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "OrganHeal AI",
  url: SITE_URL,
};
