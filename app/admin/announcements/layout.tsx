import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Homepage Health Notes",
  robots: { index: false, follow: false },
};

export default function AnnouncementsAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
