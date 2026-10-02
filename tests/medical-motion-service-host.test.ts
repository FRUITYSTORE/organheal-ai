import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Exercises the native validator without reflective loading or service/provider access.
describe.skipIf(process.platform !== "win32")("native service log privacy", () => {
  it("retains fixed operational values and rejects diagnostic strings", () => {
    execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
      path.resolve("scripts/build-medical-motion-service.ps1")], { stdio: "pipe", timeout: 15000 });
    const result=execFileSync(path.resolve("dist/medical-motion-service/MedicalMotionServiceHost.exe"),
      ["--verify-log-contract"], {encoding:"utf8",stdio:"pipe",timeout:15000});
    expect(result.trim()).toBe("NATIVE_PRIVACY_20_CASES_PASSED");
  },35000);
});