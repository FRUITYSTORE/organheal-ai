import { describe, expect, it } from "vitest";
import { validatePersonalization, isValidatedComposition } from "../lib/medical-motion/composition/specification";
import { compositionScene, compositionAuthority, compositionSpecification, COMPOSITION_MECHANISMS } from "./helpers/composition-scene";
import { rasterizeOverlays } from "../lib/medical-motion/composition/overlays";
import sharp from "sharp";

const validate = (spec: unknown = compositionSpecification()) => validatePersonalization(spec, compositionScene(), compositionAuthority);
describe("private personalization boundary", () => {
  it("issues frozen runtime capability only", () => {
    const value = validate(); expect(isValidatedComposition(value)).toBe(true);
    expect(isValidatedComposition(JSON.parse(JSON.stringify(value)))).toBe(false);
    expect(Object.isFrozen(value.specification.textOverlays[0])).toBe(true);
  });
  it("rejects copied compiler scene", () => expect(() => validatePersonalization(compositionSpecification(),
    JSON.parse(JSON.stringify(compositionScene())), compositionAuthority)).toThrow("COMPOSITION_INVALID"));
  it("does not call input getters or toJSON", () => {
    let calls = 0; const spec = compositionSpecification();
    Object.defineProperty(spec, "language", { enumerable: true, get() { calls++; return "en"; } });
    expect(() => validate(spec)).toThrow(); expect(calls).toBe(0);
  });
  it.each(["anatomy", "pathology", "camera", "severity", "mechanism", "filter", "arguments", "coordinates", "shell"])("rejects %s mutation", key => {
    expect(() => validate({ ...compositionSpecification(), [key]: "injection" })).toThrow("COMPOSITION_INVALID");
  });
  it.each(["ar", "en"] as const)("accepts bounded %s Unicode and multiline", language => {
    const spec = compositionSpecification(); spec.language = language;
    spec.textOverlays[0] = { slot: "subtitle", start: 0, end: 2,
      text: language === "ar" ? "شرح تعليمي تجريبي\nالقيمة 123 mg/dL" : "TEST education\nValue 123 mg/dL" };
    expect(validate(spec).specification.language).toBe(language);
  });
  it.each(["\u0000", "\u202e", "\ud800", "{\\pos(10,10)}", "x".repeat(241), "a\nb\nc\nd"])("rejects controls, markup and oversized text %j", text => {
    const spec = compositionSpecification(); spec.textOverlays[0] = { ...spec.textOverlays[0], text };
    expect(() => validate(spec)).toThrow("COMPOSITION_INVALID");
  });
  it.each([[-1, 2], [2, 2], [3, 2], [0, 6], [NaN, 2], [0, Infinity]])("rejects invalid subtitle timing %s/%s", (start, end) => {
    const spec = compositionSpecification(); spec.textOverlays[0] = { ...spec.textOverlays[0], start, end };
    expect(() => validate(spec)).toThrow();
  });
  it("rejects unknown slot and overlapping same-slot overlays", () => {
    const spec = compositionSpecification(); spec.textOverlays = [{ ...spec.textOverlays[0], slot: "missing" } as never];
    expect(() => validate(spec)).toThrow();
    spec.textOverlays = [compositionSpecification().textOverlays[0], compositionSpecification().textOverlays[0]];
    expect(() => validate(spec)).toThrow();
  });
  it.each(["16:9", "9:16", "1:1"] as const)("supports fit-only %s", aspectRatio => {
    const spec = compositionSpecification(); spec.outputProfile.aspectRatio = aspectRatio;
    spec.textOverlays[0] = { ...spec.textOverlays[0], text: "TEST caption" };
    expect(validate(spec).specification.outputProfile.policy).toBe("fit");
    expect(() => validate({ ...spec, outputProfile: { ...spec.outputProfile, policy: "crop" } })).toThrow();
  });
  it("rejects text exceeding the fixed panel layout before media execution", () => {
    const spec = compositionSpecification(); spec.outputProfile.aspectRatio = "9:16";
    expect(() => validate(spec)).toThrow("COMPOSITION_INVALID");
  });
  it("personalized identity is stable, private and owner/context scoped", () => {
    const spec = compositionSpecification(), scene = compositionScene(), base = scene.baseFingerprint;
    const a = validatePersonalization(spec, scene, compositionAuthority);
    expect(validatePersonalization(structuredClone(spec), scene, compositionAuthority).fingerprint).toBe(a.fingerprint);
    const b = validatePersonalization(spec, scene, { ...compositionAuthority, userId: "31234567-89ab-4def-8123-456789abcdef" });
    expect(a.fingerprint).not.toBe(b.fingerprint); expect(a.scope).toBe("private-context");
    spec.textOverlays[0] = { ...spec.textOverlays[0], text: "Different TEST value" };
    expect(validatePersonalization(spec, scene, compositionAuthority).fingerprint).not.toBe(a.fingerprint);
    expect(scene.baseFingerprint).toBe(base);
  });
  it.each(COMPOSITION_MECHANISMS.map((m, index) => [m.affectedOrgans[0], index] as const))("generic %s TEST slots", (_, index) => {
    expect(validatePersonalization(compositionSpecification(), compositionScene(index), compositionAuthority).scope).toBe("private-context");
  });
  it.each(["trend", "range-marker", "band", "comparison"] as const)("bounded descriptive %s chart", kind => {
    const spec = compositionSpecification(); spec.chartOverlays = [{ slot: "chart", start: 0, end: 3,
      kind, values: [10, 20, 30], minimum: 0, maximum: 50, label: "TEST", interpretation: "descriptive-only" }];
    expect(validate(spec)).toBeTruthy();
    expect(() => validate({ ...spec, chartOverlays: [{ ...spec.chartOverlays[0], interpretation: "diagnosis" }] })).toThrow();
  });
  it("approved reusable vs private narration are distinct and timed", () => {
    const spec = compositionSpecification(); const audio = { slot: "voice-segment" as const, start: 0,
      segment: { segmentId: "TEST", version: "1", language: "en" as const, textFingerprint: "b".repeat(64),
        medicalReviewStatus: "approved" as const, audioArtifactId: "41234567-89ab-4def-8123-456789abcdef", audioSha256: "c".repeat(64), duration: 1,
        reuseScope: "reusable-no-phi" as const } };
    spec.audioSegments = [audio]; expect(validate(spec)).toBeTruthy();
    expect(() => validate({ ...spec, dynamicNarrationSlots: [audio] })).toThrow();
    expect(() => validate({ ...spec, audioSegments: [{ ...audio, segment: { ...audio.segment, medicalReviewStatus: "unreviewed" } }] })).toThrow();
    expect(() => validate({ ...spec, audioSegments: [{ ...audio, start: 5 }] })).toThrow();
  });
  it.each(["ar", "en"] as const)("rasterizes %s escaped text without remote URLs or filter interpretation", async language => {
    const spec = compositionSpecification(); spec.language = language;
    spec.textOverlays[0] = { ...spec.textOverlays[0], text: language === "ar" ? "شرح تجريبي 123\nقيمة < 200" : "TEST < 200 & value\nfile: secret" };
    const validated = validate(spec); const images = await rasterizeOverlays(validated.specification, 384, 720);
    const info = await sharp(images[0].bytes).metadata(); expect(info.format).toBe("png"); expect(info.width).toBe(384);
    expect((await sharp(images[0].bytes).stats()).channels[3].max).toBeGreaterThan(0);
  });
});
