import { literal, createCall, client } from "./helpers/medical-motion-rpc";
import { configuration, sql } from "./helpers/medical-motion-postgres";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { MedicalMotionExecutionContextRepository as Repository } from "@/lib/medical-motion/execution-context.repository";
import { contextContent } from "./helpers/medical-motion-context";
import { executeMedicalMotionRequest } from "@/lib/medical-motion/execute-medical-motion";
import * as blender from "@/lib/medical-motion/render/blender-renderer";
import * as gate from "@/lib/symptom-explanation/safety-gate";
import * as validator from "@/lib/symptom-explanation/validate-explanation-plan";
import { readExplanationAuthorization } from "@/lib/symptom-explanation/explanation-authorization";
import { canonicalExplanationJson } from "@/lib/symptom-explanation/compile-explanation-scene";
vi.mock("@/lib/medical-motion/render/blender-renderer", async original => ({
  ...await original<typeof blender>(), renderHeartScene: vi.fn(),
}));

describe("real PostgreSQL durable execution context (mandatory, no skips)", () => {
  let owner: string;
  const repo = new Repository(client);
  beforeAll(async () => {
    configuration();
    expect((await sql("show server_version;")).startsWith("17.11")).toBe(true);
    if (await sql("select to_regclass('public.medical_motion_execution_contexts') is null;") === "t") {
      await sql(readFileSync("supabase/migrations/20261001234312_medical_motion_execution_contexts.sql", "utf8"));
    }
  });
  beforeEach(async () => { owner = randomUUID(); await sql(`insert into auth.users(id) values('${owner}');`); });
  afterEach(async () => {
    // Administrative synthetic fixture cleanup ONLY in the guarded disposable
    // database. This is not an application deletion or retention API.
    await sql(`begin; alter table public.medical_motion_execution_contexts disable trigger medical_motion_execution_contexts_immutable;
      delete from public.medical_motion_execution_contexts where user_id='${owner}';
      alter table public.medical_motion_execution_contexts enable trigger medical_motion_execution_contexts_immutable;
      delete from auth.users where id='${owner}'; commit;`);
  });
  it("creates unique database IDs/timestamps and returns exact owner snapshot", async () => {
    const before = Date.now(), input = contextContent(), first = await repo.create(owner, input), second = await repo.create(owner, input);
    expect(first.id !== second.id).toBe(true); expect(Date.parse(first.createdAt) >= before - 1000).toBe(true);
    expect(first.userId === owner).toBe(true); expect((await repo.read(first.id, owner)).id === first.id).toBe(true);
    expect(JSON.stringify(first.clinical) === JSON.stringify(input.clinical)).toBe(true);
  });
  it("requires explicit matching owner; wrong and missing contexts are indistinguishable", async () => {
    const c = await repo.create(owner, contextContent());
    await expect(repo.read(c.id, randomUUID())).rejects.toThrow("CONTEXT_NOT_FOUND");
    await expect(repo.read(randomUUID(), owner)).rejects.toThrow("CONTEXT_NOT_FOUND");
    expect(await sql(`set role service_role; select count(*) from public.read_medical_motion_execution_context('${c.id}',null);`)).toBe("0");
  });
  it.each(["anon", "authenticated", "service_role"])("denies direct SELECT/INSERT/UPDATE/DELETE/TRUNCATE for %s", async role => {
    await repo.create(owner, contextContent());
    const output = await sql(`begin; set local role ${role}; do $$ begin
      begin perform 1 from public.medical_motion_execution_contexts; raise exception 'Unexpected read'; exception when insufficient_privilege then null; end;
      begin insert into public.medical_motion_execution_contexts(user_id) values('${owner}'); raise exception 'Unexpected insert'; exception when insufficient_privilege then null; end;
      begin update public.medical_motion_execution_contexts set asset_version='changed'; raise exception 'Unexpected update'; exception when insufficient_privilege then null; end;
      begin delete from public.medical_motion_execution_contexts; raise exception 'Unexpected delete'; exception when insufficient_privilege then null; end;
      begin truncate public.medical_motion_execution_contexts; raise exception 'Unexpected truncate'; exception when insufficient_privilege then null; end;
      end $$; select 'PASSED'; rollback;`);
    expect(output).toBe("PASSED");
  });
  it.each(["anon", "authenticated"])("denies create/read RPC to %s", async role => {
    const output = await sql(`begin; set local role ${role}; do $$ begin
      begin perform ${createCall(owner)}; raise exception 'Unexpected create'; exception when insufficient_privilege then null; end;
      begin perform public.read_medical_motion_execution_context(gen_random_uuid(),'${owner}'); raise exception 'Unexpected read'; exception when insufficient_privilege then null; end;
      end $$; select 'PASSED'; rollback;`); expect(output).toBe("PASSED");
  });
  it("immutability trigger rejects privileged updates of every field and deletes", async () => {
    const c = await repo.create(owner, contextContent());
    const output = await sql(`begin; do $$ begin
      begin update public.medical_motion_execution_contexts set clinical_message='changed',candidate_plan='{}',
        asset_version='changed',execution_version='2',schema_version='2',clinical_language='ar',created_at=clock_timestamp(),user_id='${owner}',id=gen_random_uuid()
        where id='${c.id}'; raise exception 'Mutation accepted' using errcode='22023'; exception when object_not_in_prerequisite_state then null; end;
      begin delete from public.medical_motion_execution_contexts where id='${c.id}';
        raise exception 'Deletion accepted' using errcode='22023'; exception when object_not_in_prerequisite_state then null; end;
      end $$; select 'PASSED'; rollback;`); expect(output).toBe("PASSED");
    expect((await repo.read(c.id, owner)).id === c.id).toBe(true);
  });
  it("restricts owner deletion instead of cascading immutable snapshots", async () => {
    await repo.create(owner, contextContent());
    expect(await sql(`begin; do $$ begin
      begin delete from auth.users where id='${owner}'; raise exception 'Cascade allowed'; exception when foreign_key_violation then null; end;
      end $$; select 'PASSED'; rollback;`)).toBe("PASSED");
  });
  it.each(["schema", "execution", "language", "plan", "message", "asset"])("database RPC rejects malformed %s envelope", async field => {
    const input = contextContent();
    if (field === "schema") input.schemaVersion = "2" as "1";
    if (field === "execution") input.executionVersion = "2" as "1";
    if (field === "language") input.clinical.language = "fr" as "en";
    if (field === "plan") input.candidatePlan = {};
    if (field === "message") input.clinical.message = "x".repeat(65537);
    if (field === "asset") input.assetVersion = "../asset";
    expect(await sql(`begin; set local role service_role; do $$ begin
      begin perform ${createCall(owner, input)}; raise exception 'Invalid accepted' using errcode='55000';
      exception when invalid_parameter_value then null; end; end $$; select 'PASSED'; rollback;`)).toBe("PASSED");
  });
  it("repository rejects unknown fields before actual PostgreSQL storage", async () => {
    await expect(repo.create(owner, { ...contextContent(), metadata: { sensitive: "synthetic" } })).rejects.toThrow("INVALID_CONTEXT");
    expect(await sql(`select count(*) from public.medical_motion_execution_contexts where user_id='${owner}';`)).toBe("0");
  });
  it("snapshot ignores caller/source mutation and reconstructs exact bilingual clinical and candidate content", async () => {
    const input = contextContent(); input.clinical = { message: "  تعب خفيف  ", language: "ar" };
    const expected = structuredClone(input), c = await repo.create(owner, input);
    input.clinical.message = "changed"; (input.candidatePlan as Record<string, unknown>).topic = "changed";
    const output = await repo.reconstruct(c.id, owner, 1);
    expect(JSON.stringify(output.clinical) === JSON.stringify(expected.clinical)).toBe(true);
    // JSONB key order is unrelated to snapshot identity.
    expect(JSON.stringify(output.plan) === JSON.stringify((await repo.read(c.id, owner)).candidatePlan)).toBe(true);
    expect(canonicalExplanationJson(output.plan) === canonicalExplanationJson(expected.candidatePlan)).toBe(true);
    expect(output.sceneIndex).toBe(1);
  });
  it("two real connections read the same fixed context without changing state", async () => {
    const c = await repo.create(owner, contextContent());
    const results = await Promise.all([repo.read(c.id, owner), repo.read(c.id, owner)]);
    expect(results.every(r => r.id === c.id && r.createdAt === c.createdAt)).toBe(true);
    expect(await sql(`select count(*) from public.medical_motion_execution_contexts where user_id='${owner}';`)).toBe("1");
  });
  it.each(["valid", "urgent", "myocardium"])("real stored %s candidate re-enters authoritative execution gates", async scenario => {
    const input = contextContent(scenario === "myocardium" ? "myocardialOxygenDemandSupply" : "leftVentricularPressureLoad");
    if (scenario === "urgent") input.clinical.message = "I have chest pain.";
    const c = await repo.create(owner, input), reconstructed = await repo.reconstruct(c.id, owner, 0);
    const evaluate = vi.spyOn(gate, "evaluateSafetyGate"), validate = vi.spyOn(validator, "validateVideoExplanationPlan");
    vi.mocked(blender.renderHeartScene).mockResolvedValue({ status: "completed", outputPath: "owned/test.mp4", durationSeconds: 1 });
    const result = await executeMedicalMotionRequest(reconstructed, { clinicalContextId: c.id, assetVersion: c.assetVersion,
      mode: "development", outputPath: "test.mp4" });
    expect(evaluate.mock.calls[0][0] === input.clinical.message && evaluate.mock.calls[0][1] === input.clinical.language).toBe(true);
    if (scenario === "valid") {
      expect(result.status).toBe("completed"); expect(validate).toHaveBeenCalled();
      expect(readExplanationAuthorization(vi.mocked(blender.renderHeartScene).mock.calls[0][2].clinicalAuthorization) !== null).toBe(true);
    } else {
      expect(result).toMatchObject({ errorCode: scenario === "urgent" ? "UNSAFE_FOR_VIDEO_FIRST" : "ANATOMY_STRUCTURE_NOT_FOUND" });
      expect(blender.renderHeartScene).not.toHaveBeenCalled();
      if (scenario === "urgent") expect(validate).not.toHaveBeenCalled(); else expect(validate).toHaveBeenCalled();
    }
  });
  it("RLS, empty search paths and narrow grants coexist with existing job/result contracts", async () => {
    expect(await sql(`select relrowsecurity from pg_class where oid='public.medical_motion_execution_contexts'::regclass;`)).toBe("t");
    expect(await sql(`select count(*) from pg_proc where proname in ('create_medical_motion_execution_context','read_medical_motion_execution_context')
      and prosecdef and array_to_string(proconfig,',')='search_path=""';`)).toBe("2");
    expect(await sql(`select (to_regclass('public.background_jobs') is not null and to_regclass('public.background_job_results') is not null
      and to_regprocedure('public.publish_background_job_result(uuid,uuid,text,uuid)') is not null);`)).toBe("t");
  });
});
