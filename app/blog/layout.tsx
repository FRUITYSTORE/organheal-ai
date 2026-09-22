import type { Metadata } from "next";

export const metadata: Metadata = {
  // A plain string here would replace the root template for every post
  // under /blog/[slug] (see the same note in app/library/layout.tsx).
  title: {
    template: "%s | OrganHeal AI",
    default: "Health Articles",
  },
  description:
    "Patient-friendly explanations for lab results, health topics, and better conversations with your clinician, from the OrganHeal AI team.",
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
