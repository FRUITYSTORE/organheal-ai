import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Video studio",
  robots: { index: false, follow: false },
};

export default function StudioVideoAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
