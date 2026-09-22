import type { Metadata } from "next";

export const metadata: Metadata = {
  // See the comment in app/library/layout.tsx: repeating the template here
  // keeps it applied to /library/organs/heart and any future organ page
  // nested under this segment.
  title: {
    template: "%s | OrganHeal AI",
    default: "Learn by Body System",
  },
  description:
    "Choose the body system you want to understand. Each area connects health concepts with relevant lab markers, reports, and useful questions.",
};

export default function LibraryOrgansLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
