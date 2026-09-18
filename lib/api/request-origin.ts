/**
 * Resolves the site origin to build Stripe redirect URLs from, without
 * needing a hardcoded/configured app-URL environment variable. Trusts the
 * standard Origin/Host headers a browser fetch from our own app sends,
 * since these routes are only ever called from our own authenticated
 * client.
 */
export function resolveRequestOrigin(request: Request): string {
  const origin = request.headers.get("origin");

  if (origin && /^https?:\/\//.test(origin)) {
    return origin;
  }

  const host = request.headers.get("host");

  if (host) {
    const scheme = host.startsWith("localhost") ? "http" : "https";
    return `${scheme}://${host}`;
  }

  return "http://localhost:3000";
}
