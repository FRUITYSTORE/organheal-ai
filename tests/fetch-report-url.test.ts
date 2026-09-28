import { describe, expect, it } from "vitest";

import {
  guessFileName,
  isPrivateIPv4,
  isPrivateIPv6,
} from "../lib/report-ingestion/fetch-report-url";

describe("isPrivateIPv4 (SSRF guard)", () => {
  it("blocks loopback", () => {
    expect(isPrivateIPv4("127.0.0.1")).toBe(true);
  });

  it("blocks the cloud metadata address", () => {
    expect(isPrivateIPv4("169.254.169.254")).toBe(true);
  });

  it("blocks all three private RFC1918 ranges", () => {
    expect(isPrivateIPv4("10.0.0.5")).toBe(true);
    expect(isPrivateIPv4("172.16.0.5")).toBe(true);
    expect(isPrivateIPv4("172.31.255.255")).toBe(true);
    expect(isPrivateIPv4("192.168.1.1")).toBe(true);
  });

  it("does not block a real public address in the 172.x range outside 16-31", () => {
    expect(isPrivateIPv4("172.64.0.1")).toBe(false);
  });

  it("allows an ordinary public address", () => {
    expect(isPrivateIPv4("93.184.216.34")).toBe(false);
  });

  it("treats a malformed address as unsafe rather than guessing", () => {
    expect(isPrivateIPv4("not-an-ip")).toBe(true);
  });
});

describe("isPrivateIPv6 (SSRF guard)", () => {
  it("blocks loopback and link-local", () => {
    expect(isPrivateIPv6("::1")).toBe(true);
    expect(isPrivateIPv6("fe80::1")).toBe(true);
  });

  it("blocks unique-local ranges", () => {
    expect(isPrivateIPv6("fc00::1")).toBe(true);
    expect(isPrivateIPv6("fd12::1")).toBe(true);
  });

  it("blocks an IPv4-mapped private address", () => {
    expect(isPrivateIPv6("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateIPv6("::ffff:192.168.1.1")).toBe(true);
  });

  it("allows an ordinary public IPv6 address", () => {
    expect(isPrivateIPv6("2606:4700:4700::1111")).toBe(false);
  });
});

describe("guessFileName", () => {
  it("uses the URL's own file name when it has an extension", () => {
    expect(guessFileName(new URL("https://lab.example.com/results/12345.pdf"), null)).toBe("12345.pdf");
  });

  it("falls back to a content-type-based extension when the path has none", () => {
    expect(guessFileName(new URL("https://lab.example.com/view?id=1"), "application/pdf")).toBe(
      "linked-report.pdf"
    );
  });

  it("falls back to a plain name for an unrecognised content type", () => {
    expect(guessFileName(new URL("https://lab.example.com/view"), "application/octet-stream")).toBe(
      "linked-report"
    );
  });
});
