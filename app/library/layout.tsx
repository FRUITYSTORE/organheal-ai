import type { Metadata } from "next";

export const metadata: Metadata = {
  // A plain string here would replace the root template for everything
  // under /library (e.g. /library/organs, /library/doctor-prep), since a
  // title.template only carries down to child segments when the segment
  // that sets it redeclares one. Repeating the root's template keeps the
  // " | OrganHeal AI" suffix on every nested page under /library.
  title: {
    template: "%s | OrganHeal AI",
    default: "Health Learning Hub",
  },
  description:
    "Learn about lab markers, organ health, and medical reports one clear topic at a time — patient-friendly explanations for better conversations with your doctor.",
};

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
