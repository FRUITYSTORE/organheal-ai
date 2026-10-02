import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MedicalMotionExecutionContextRepository as Repository } from "@/lib/medical-motion/execution-context.repository";
import { contextContent } from "./helpers/medical-motion-context";
import { EXECUTION_INPUT_LIMITS } from "@/lib/medical-motion/validation/json-snapshot";
import { executeMedicalMotionRequest } from "@/lib/medical-motion/execute-medical-motion";
import * as blender from "@/lib/medical-motion/render/blender-renderer";
import * as gate from "@/lib/symptom-explanation/safety-gate";
import * as validator from "@/lib/symptom-explanation/validate-explanation-plan";
import { readExplanationAuthorization } from "@/lib/symptom-explanation/explanation-authorization";

vi.mock("@/lib/medical-motion/render/blender-renderer", async original => ({
  ...await original<typeof blender>(), renderHeartScene: vi.fn(),
}));
const owner = "11111111-1111-4111-8111-111111111111", id = "22222222-2222-4222-8222-222222222222";
const other = "33333333-3333-4333-8333-333333333333";
function dbRow(input = contextContent()) {
  return { id, user_id: owner, schema_version: input.schemaVersion, execution_version: input.executionVersion,
    asset_version: input.assetVersion, clinical_message: input.clinical.message, clinical_language: input.clinical.language,
    candidate_plan: structuredClone(input.candidatePlan), created_at: "2026-10-01T12:00:00.000Z" };
}
function memory() {
  let stored: ReturnType<typeof dbRow> | null = null;
  const rpc = vi.fn(async (name: string, params: Record<string, unknown>) => {
    if (name.startsWith("create_")) stored = { ...dbRow(), clinical_message: params.p_clinical_message as string,
      clinical_language: params.p_clinical_language as "en" | "ar", asset_version: params.p_asset_version as string,
      candidate_plan: structuredClone(params.p_candidate_plan) as ReturnType<typeof dbRow>["candidate_plan"] };
    return { data: stored && params.p_user_id === owner ? [structuredClone(stored)] : [], error: null };
  });
  return { rpc, repo: new Repository({ rpc } as unknown as SupabaseClient) };
}
describe("protected immutable execution-context repository", () => {
  beforeEach(() => { vi.mocked(blender.renderHeartScene).mockResolvedValue({ status: "completed", outputPath: "owned/test.mp4", durationSeconds: 1 }); });
  it("creates a validated exact snapshot with separate trusted identity and DB fields", async () => {
    const { repo, rpc } = memory(), input = contextContent();
    const result = await repo.create(owner, input);
    expect(JSON.stringify(result) === JSON.stringify({ ...input, id, userId: owner, createdAt: "2026-10-01T12:00:00.000Z" })).toBe(true);
    expect(rpc.mock.calls[0][1].p_user_id === owner).toBe(true);
    expect(result).not.toHaveProperty("sceneIndex");
  });
  it("reads/reconstructs exact bilingual input independent of caller and source mutations", async () => {
    const { repo } = memory(), input = contextContent(); input.clinical = { message: "  تعب خفيف  ", language: "ar" };
    const expected = structuredClone(input); await repo.create(owner, input);
    input.clinical.message = "changed"; (input.candidatePlan as Record<string, unknown>).topic = "changed";
    const read = await repo.read(id, owner); read.clinical.message = "mutated result";
    const reconstructed = await repo.reconstruct(id, owner, 1);
    expect(reconstructed.clinical === expected.clinical).toBe(false);
    expect(JSON.stringify(reconstructed.clinical) === JSON.stringify(expected.clinical)).toBe(true);
    expect(JSON.stringify(reconstructed.plan) === JSON.stringify(expected.candidatePlan)).toBe(true);
    expect(reconstructed.sceneIndex).toBe(1);
  });
  it("wrong owner and missing context return the same safe error", async () => {
    const { repo } = memory(); await expect(repo.read(id, owner)).rejects.toThrow("CONTEXT_NOT_FOUND");
    await repo.create(owner, contextContent()); await expect(repo.read(id, other)).rejects.toThrow("CONTEXT_NOT_FOUND");
  });
  it.each(["bad", "", null, {}, id + "\n"])("rejects invalid identities %# without DB access", async value => {
    const { repo, rpc } = memory(); await expect(repo.create(value as string, contextContent())).rejects.toThrow("INVALID_CONTEXT");
    await expect(repo.read(value as string, owner)).rejects.toThrow("INVALID_CONTEXT"); expect(rpc).not.toHaveBeenCalled();
  });
  it.each(["userId", "id", "createdAt", "sceneIndex", "signal", "control", "capability", "authorization", "safetyApproved",
    "outputPath", "blenderConfig", "timeoutMs", "metadata", "attemptToken", "sourceId"])("rejects unapproved root %s", async key => {
    const { repo, rpc } = memory(); await expect(repo.create(owner, { ...contextContent(), [key]: "rejected-sensitive-value" })).rejects.toThrow("INVALID_CONTEXT");
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([
    { schemaVersion: "2" }, { executionVersion: "2" }, { assetVersion: "../asset" }, { assetVersion: "C:\\asset" },
    { assetVersion: "a".repeat(129) }, { clinical: { message: "x", language: "fr" } },
    { clinical: { message: " ", language: "en" } }, { clinical: { message: "x\u0000", language: "en" } },
    { clinical: { message: "x".repeat(EXECUTION_INPUT_LIMITS.stringLength + 1), language: "en" } },
    { candidatePlan: {} }, { clinical: { message: "x", language: "en", approval: true } },
  ])("rejects malformed bounded contract %# with static diagnostics", async patch => {
    const { repo, rpc } = memory(); await expect(repo.create(owner, { ...contextContent(), ...patch })).rejects.toThrow(/^INVALID_CONTEXT$/);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("rejects unknown plan fields and nested authority", async () => {
    const { repo } = memory(), input = contextContent();
    (input.candidatePlan as Record<string, unknown>).signal = {};
    await expect(repo.create(owner, input)).rejects.toThrow("INVALID_CONTEXT");
    const nested = contextContent(); ((nested.candidatePlan as Record<string, unknown>).safety as Record<string, unknown>).approval = true;
    await expect(repo.create(owner, nested)).rejects.toThrow("INVALID_CONTEXT");
  });
  it("rejects getters/prototypes/cycles/symbols without invoking getters", async () => {
    const { repo, rpc } = memory(), input = contextContent(), get = vi.fn(() => "secret");
    Object.defineProperty(input.clinical, "message", { get, enumerable: true });
    await expect(repo.create(owner, input)).rejects.toThrow("INVALID_CONTEXT"); expect(get).not.toHaveBeenCalled();
    await expect(repo.create(owner, Object.assign(Object.create({}), contextContent()))).rejects.toThrow("INVALID_CONTEXT");
    const cyclic: Record<string, unknown> = contextContent(); cyclic.candidatePlan = cyclic;
    await expect(repo.create(owner, cyclic)).rejects.toThrow("INVALID_CONTEXT");
    const symbolic = { ...contextContent(), [Symbol("hidden")]: true };
    await expect(repo.create(owner, symbolic)).rejects.toThrow("INVALID_CONTEXT"); expect(rpc).not.toHaveBeenCalled();
  });
  it.each(["depth", "width", "nodes", "aggregate"])("reuses decoded JSON %s bounds", async kind => {
    const { repo, rpc } = memory(), input = contextContent();
    if (kind === "depth") { let nested: unknown = null; for (let i = 0; i < 65; i++) nested = { nested }; input.candidatePlan = nested as never; }
    if (kind === "width") input.candidatePlan = Array(1025).fill(null);
    if (kind === "nodes") input.candidatePlan = Array.from({ length: 100 }, () => Array(100).fill(null));
    if (kind === "aggregate") input.candidatePlan = Array(5).fill("x".repeat(65536));
    await expect(repo.create(owner, input)).rejects.toThrow("INVALID_CONTEXT"); expect(rpc).not.toHaveBeenCalled();
  });
  it.each([null, {}, [undefined], [dbRow(), dbRow()], [{ ...dbRow(), user_id: other }], [{ ...dbRow(), id: other }],
    [{ ...dbRow(), candidate_plan: {} }], [{ ...dbRow(), created_at: "yesterday" }], [{ ...dbRow(), unexpected: true }],
    [{ ...dbRow(), execution_version: "2" }]])("rejects malformed/owner-mismatched RPC result %#", async data => {
    const rpc = vi.fn().mockResolvedValue({ data, error: null }), repo = new Repository({ rpc } as unknown as SupabaseClient);
    await expect(repo.read(id, owner)).rejects.toThrow("INVALID_CONTEXT_RESULT");
  });
  it("rejects create empty and altered returned content", async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: [], error: null }).mockResolvedValueOnce({ data: [{ ...dbRow(), clinical_message: "altered" }], error: null });
    const repo = new Repository({ rpc } as unknown as SupabaseClient);
    await expect(repo.create(owner, contextContent())).rejects.toThrow("INVALID_CONTEXT_RESULT");
    await expect(repo.create(owner, contextContent())).rejects.toThrow("INVALID_CONTEXT_RESULT");
  });
  it("does not invoke accessors in malformed RPC envelopes or rows", async () => {
    const get = vi.fn(() => { throw new Error("rejected-sensitive-value"); });
    const data: unknown[] = []; Object.defineProperty(data, "0", { get, enumerable: true });
    const rpc = vi.fn().mockResolvedValue({ data, error: null }), repo = new Repository({ rpc } as unknown as SupabaseClient);
    await expect(repo.read(id, owner)).rejects.toThrow("INVALID_CONTEXT_RESULT"); expect(get).not.toHaveBeenCalled();
    const row = dbRow(); Object.defineProperty(row, "clinical_message", { get, enumerable: true });
    rpc.mockResolvedValue({ data: [row], error: null });
    await expect(repo.read(id, owner)).rejects.toThrow("INVALID_CONTEXT_RESULT"); expect(get).not.toHaveBeenCalled();
  });
  it("accepts the individual message boundary and preserves storage/read/execution bounds", async () => {
    const { repo } = memory(), input = contextContent(); input.clinical.message = "x".repeat(EXECUTION_INPUT_LIMITS.stringLength);
    await repo.create(owner, input); const reconstructed = await repo.reconstruct(id, owner, 0);
    expect(reconstructed.clinical.message.length).toBe(EXECUTION_INPUT_LIMITS.stringLength);
    const result = await executeMedicalMotionRequest(reconstructed, { clinicalContextId: id, assetVersion: input.assetVersion,
      mode: "development", outputPath: "test.mp4" }); expect(result.status).toBe("completed");
  });
  it.each([false, true])("maps thrown/provider errors without content echo %#", async thrown => {
    const rpc = thrown ? vi.fn().mockRejectedValue(new Error("rejected-sensitive-value")) :
      vi.fn().mockResolvedValue({ error: { message: "rejected-sensitive-value" }, data: null });
    const repo = new Repository({ rpc } as unknown as SupabaseClient);
    await expect(repo.create(owner, contextContent())).rejects.toThrow(/^CONTEXT_CREATE_FAILED$/);
    await expect(repo.read(id, owner)).rejects.toThrow(/^CONTEXT_READ_FAILED$/);
  });
  it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("rejects invalid separate sceneIndex %#", async index => {
    const { repo, rpc } = memory(); await expect(repo.reconstruct(id, owner, index)).rejects.toThrow("INVALID_CONTEXT"); expect(rpc).not.toHaveBeenCalled();
  });
  it("never substitutes an unavailable recorded asset version", async () => {
    const { repo } = memory(), input = contextContent(); input.assetVersion = "future-asset";
    await repo.create(owner, input); await expect(repo.reconstruct(id, owner, 0)).rejects.toThrow("CONTEXT_VERSION_UNAVAILABLE");
  });
  it("reconstruction re-runs real request validation, Safety Gate, plan checks and runtime authority", async () => {
    const { repo } = memory(), input = contextContent(); await repo.create(owner, input);
    const reconstructed = await repo.reconstruct(id, owner, 0);
    const evaluate = vi.spyOn(gate, "evaluateSafetyGate"), validate = vi.spyOn(validator, "validateVideoExplanationPlan");
    const result = await executeMedicalMotionRequest(reconstructed, { clinicalContextId: id, assetVersion: input.assetVersion,
      mode: "development", outputPath: "test.mp4" });
    expect(result.status).toBe("completed"); expect(evaluate).toHaveBeenCalled(); expect(validate).toHaveBeenCalled();
    const call = vi.mocked(blender.renderHeartScene).mock.calls[0];
    const authority = readExplanationAuthorization(call[2].clinicalAuthorization);
    expect(authority !== null).toBe(true);
    expect(evaluate.mock.calls[0][0] === input.clinical.message && evaluate.mock.calls[0][1] === input.clinical.language).toBe(true);
    expect(reconstructed).not.toHaveProperty("authorization");
    expect(await executeMedicalMotionRequest({ ...reconstructed, signal: {} }, { clinicalContextId: id,
      assetVersion: input.assetVersion, mode: "development", outputPath: "test.mp4" })).toMatchObject({ errorCode: "INVALID_EXECUTION_REQUEST" });
  });
  it("persisted urgent input still blocks before plan validation", async () => {
    const { repo } = memory(), input = contextContent(); input.clinical.message = "I have chest pain.";
    await repo.create(owner, input); const reconstructed = await repo.reconstruct(id, owner, 0);
    const validate = vi.spyOn(validator, "validateVideoExplanationPlan");
    expect(await executeMedicalMotionRequest(reconstructed, { clinicalContextId: id, assetVersion: input.assetVersion,
      mode: "development", outputPath: "test.mp4" })).toMatchObject({ errorCode: "UNSAFE_FOR_VIDEO_FIRST" });
    expect(validate).not.toHaveBeenCalled(); expect(blender.renderHeartScene).not.toHaveBeenCalled();
  });
  it("persisted myocardium-dependent candidate still fails real anatomy readiness", async () => {
    const { repo } = memory(), input = contextContent("myocardialOxygenDemandSupply");
    await repo.create(owner, input); const reconstructed = await repo.reconstruct(id, owner, 0);
    expect(await executeMedicalMotionRequest(reconstructed, { clinicalContextId: id, assetVersion: input.assetVersion,
      mode: "development", outputPath: "test.mp4" })).toMatchObject({ errorCode: "ANATOMY_STRUCTURE_NOT_FOUND" });
    expect(blender.renderHeartScene).not.toHaveBeenCalled();
  });
});
