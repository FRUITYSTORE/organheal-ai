import { type NextRequest, NextResponse } from "next/server";

const noIndexPrefixes = [
  "/dashboard",
  "/reports",
  "/intelligence",
  "/health-plan",
  "/history",
  "/profile",
  "/lab-upload",
  "/checkin",
  "/organ-report",
  "/admin",
  "/onboarding",
  "/pricing",
  "/reset-password",
  "/api",
];

function shouldNoIndex(pathname: string) {
  return noIndexPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  if (shouldNoIndex(pathname)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|og-image.png|robots.txt|sitemap.xml).*)",
  ],
};
