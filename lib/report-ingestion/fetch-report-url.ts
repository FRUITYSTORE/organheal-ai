import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Fetches a member-supplied URL to a lab result server-side, with SSRF
// protections a normal client-side fetch cannot have: the server itself
// must never be tricked into reaching internal/private infrastructure on
// the member's behalf (e.g. a cloud metadata endpoint or an internal admin
// panel) just because they pasted a link.
const FETCH_TIMEOUT_MS = 15_000;
const MAX_BYTES = 20 * 1024 * 1024; // Same 20 MB cap as a direct file upload.

export type FetchedUrlContent = {
  buffer: Buffer;
  contentType: string | null;
  fileName: string;
};

export type FetchReportUrlError =
  | "invalid_url"
  | "blocked_host"
  | "fetch_failed"
  | "too_large"
  | "empty";

export class FetchReportUrlFailure extends Error {
  constructor(public readonly code: FetchReportUrlError, message: string) {
    super(message);
    this.name = "FetchReportUrlFailure";
  }
}

// Exported so the SSRF guard's actual classification logic can be
// unit-tested directly, without mocking DNS or fetch.
export function isPrivateIPv4(address: string): boolean {
  const parts = address.split(".").map(Number);

  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) {
    return true; // Malformed — treat as unsafe rather than guess.
  }

  const [a, b] = parts;

  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) || // link-local, includes 169.254.169.254 (cloud metadata)
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 0 ||
    a >= 224 // multicast/reserved
  );
}

export function isPrivateIPv6(address: string): boolean {
  const normalized = address.toLowerCase();

  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") || // unique local
    normalized.startsWith("fe80") || // link-local
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:169.254.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

async function assertPublicHost(hostname: string): Promise<void> {
  // A literal IP in the URL — check it directly without a DNS round trip.
  const literalVersion = isIP(hostname);

  if (literalVersion === 4 && isPrivateIPv4(hostname)) {
    throw new FetchReportUrlFailure("blocked_host", "That address is not allowed.");
  }

  if (literalVersion === 6 && isPrivateIPv6(hostname)) {
    throw new FetchReportUrlFailure("blocked_host", "That address is not allowed.");
  }

  if (literalVersion) {
    return;
  }

  // A hostname resolves to whatever DNS says right now — check the actual
  // resolved addresses, not just the name, so a name that points at a
  // private address is caught too.
  let resolved: Array<{ address: string; family: number }>;

  try {
    resolved = await lookup(hostname, { all: true });
  } catch {
    throw new FetchReportUrlFailure("invalid_url", "That link could not be resolved.");
  }

  if (resolved.length === 0) {
    throw new FetchReportUrlFailure("invalid_url", "That link could not be resolved.");
  }

  for (const { address, family } of resolved) {
    if (family === 4 && isPrivateIPv4(address)) {
      throw new FetchReportUrlFailure("blocked_host", "That address is not allowed.");
    }

    if (family === 6 && isPrivateIPv6(address)) {
      throw new FetchReportUrlFailure("blocked_host", "That address is not allowed.");
    }
  }
}

export function guessFileName(url: URL, contentType: string | null): string {
  const lastSegment = url.pathname.split("/").filter(Boolean).pop();

  if (lastSegment && lastSegment.includes(".")) {
    return lastSegment;
  }

  const extensionByType: Record<string, string> = {
    "application/pdf": ".pdf",
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "text/plain": ".txt",
    "text/html": ".html",
  };

  return `linked-report${extensionByType[contentType ?? ""] ?? ""}`;
}

export async function fetchReportUrl(rawUrl: string): Promise<FetchedUrlContent> {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    throw new FetchReportUrlFailure("invalid_url", "That does not look like a valid link.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new FetchReportUrlFailure("invalid_url", "Only http and https links are supported.");
  }

  await assertPublicHost(url.hostname);

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      redirect: "manual", // A redirect could point at a private address — re-validate it ourselves instead of following it blindly.
      signal: abortController.signal,
      headers: { "User-Agent": "OrganHealAI-ReportFetcher/1.0" },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");

      if (!location) {
        throw new FetchReportUrlFailure("fetch_failed", "That link redirected without a destination.");
      }

      // One redirect hop, fully re-validated — same protections as the
      // original request, not a blind follow.
      return fetchReportUrl(new URL(location, url).toString());
    }

    if (!response.ok || !response.body) {
      throw new FetchReportUrlFailure("fetch_failed", `That link returned status ${response.status}.`);
    }

    const contentLength = Number(response.headers.get("content-length") ?? "0");

    if (contentLength > MAX_BYTES) {
      throw new FetchReportUrlFailure("too_large", "That file is larger than the 20 MB limit.");
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
      totalBytes += chunk.length;

      if (totalBytes > MAX_BYTES) {
        throw new FetchReportUrlFailure("too_large", "That file is larger than the 20 MB limit.");
      }

      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    if (buffer.length === 0) {
      throw new FetchReportUrlFailure("empty", "That link returned no content.");
    }

    const contentType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? null;

    return { buffer, contentType, fileName: guessFileName(url, contentType) };
  } catch (error) {
    if (error instanceof FetchReportUrlFailure) {
      throw error;
    }

    throw new FetchReportUrlFailure("fetch_failed", "That link could not be reached.");
  } finally {
    clearTimeout(timeoutId);
  }
}
