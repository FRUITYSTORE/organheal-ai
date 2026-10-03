import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { isolatedPostgresQuery, isolatedPostgresTarget } from "@/lib/medical-motion/worker/postgres-transport";
import { createIsolatedMotionDatabase } from "@/lib/medical-motion/worker/local-postgres";

it("preserves text results and rollback in the same session without an executable", async () => {
  const env = { ...process.env, ORGANHEAL_TEST_PSQL: undefined };
  expect(await isolatedPostgresQuery(env, "begin;create temporary table motion_transport_test(value integer);insert into motion_transport_test values(1);rollback;select to_regclass('motion_transport_test') is null;")).toBe("t");
  expect(await isolatedPostgresQuery(env, "select true,false,1::bigint,'text';")).toBe("t|f|1|text");
});
it("preserves SQLSTATE but hides SQL and driver diagnostics", async () => {
  await expect(isolatedPostgresQuery(process.env, "select * from motion_transport_missing_relation;")).rejects.toMatchObject({ message: "ISOLATED_DATABASE_RPC_FAILED", code: "42P01" });
});
it("classifies connection refusal without raw diagnostics", async () => {
  const target = new URL(process.env.ORGANHEAL_OWNERSHIP_TEST_DATABASE_URL!); target.port = "1";
  await expect(isolatedPostgresQuery({ ...process.env, ORGANHEAL_OWNERSHIP_TEST_DATABASE_URL: target.href }, "select 1;")).rejects.toThrow("ISOLATED_DATABASE_UNAVAILABLE");
});
it("signals locks before the same session continues", async () => {
  const signal = vi.fn();
  await isolatedPostgresQuery(process.env, "begin;select 'JOB_LOCKED';select 1;rollback;", signal);
  expect(signal).toHaveBeenCalledTimes(1);
});
it("rejects connection-option overrides and has no subprocess transport", () => {
  expect(() => isolatedPostgresTarget({ ...process.env, ORGANHEAL_OWNERSHIP_TEST_DATABASE_URL: "postgres://test:test@localhost/organheal_ownership_test_step3c?host=remote" })).toThrow("INVALID_ISOLATED_DATABASE");
  expect(readFileSync("lib/medical-motion/worker/postgres-transport.ts", "utf8")).not.toMatch(/child_process|spawn\(/);
});
it("retains a bounded response size", async () => {
  await expect(isolatedPostgresQuery(process.env, "select repeat('x',2100000);")).rejects.toThrow("ISOLATED_DATABASE_RESPONSE_INVALID");
});
it("classifies statement timeout with its SQLSTATE", async () => {
  await expect(isolatedPostgresQuery(process.env, "set statement_timeout=10;select pg_sleep(0.1);")).rejects.toMatchObject({ message: "ISOLATED_DATABASE_TIMEOUT", code: "57014" });
});
it("performs real version/schema readiness without psql", async () => {
  expect(await createIsolatedMotionDatabase({ ...process.env, ORGANHEAL_TEST_PSQL: undefined }).readiness()).toBe(true);
});
it("checks reusable schema readiness and reaches the real fenced cache RPC",async()=>{
  const database=createIsolatedMotionDatabase({...process.env,ORGANHEAL_TEST_PSQL:undefined});
  expect(await database.readiness(true)).toBe(true);
  const uuid="00000000-0000-4000-8000-000000000001";
  const r=await database.client.rpc("motion_reuse_operation",{p_job_id:uuid,p_user_id:uuid,p_attempt_token:uuid,p_action:"reserve",p_identity:{},p_epoch:null,p_artifact_id:null});
  expect(r.error?.code).toBe("OM403");expect(r.data).toBeNull();
});
