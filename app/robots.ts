import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/dashboard/",
          "/reports",
          "/reports/",
          "/intelligence",
          "/intelligence/",
          "/health-plan",
          "/health-plan/",
          "/history",
          "/history/",
          "/profile",
          "/profile/",
          "/lab-upload",
          "/lab-upload/",
          "/checkin",
          "/checkin/",
          "/organ-report",
          "/organ-report/",
          "/admin",
          "/admin/",
          "/onboarding",
          "/onboarding/",
          "/pricing",
          "/pricing/",
          "/reset-password",
          "/reset-password/",
          "/api",
          "/api/",
        ],
      },
    ],
    sitemap: "https://www.organheal.com/sitemap.xml",
  };
}
