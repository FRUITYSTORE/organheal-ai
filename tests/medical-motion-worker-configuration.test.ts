import { describe, expect, it } from "vitest";
import { isolatedStorageClient } from "@/lib/medical-motion/worker/entry";
import { createIsolatedMotionDatabase } from "@/lib/medical-motion/worker/local-postgres";
describe("isolated host connection gates", () => {
  it.each([undefined, "", "http://pmjuyyqofkdbgqmrdbuh.supabase.co", "https://production.supabase.co", "https://pmjuyyqofkdbgqmrdbuh.supabase.co:444", "https://user:password@pmjuyyqofkdbgqmrdbuh.supabase.co", "https://pmjuyyqofkdbgqmrdbuh.supabase.co/extra"])("rejects unsafe Storage configuration before any request", url => {
    expect(() => isolatedStorageClient({ ...process.env, MEDICAL_MOTION_WORKER_ENVIRONMENT: "isolated-test", NEXT_PUBLIC_SUPABASE_URL: url })).toThrow("INVALID_ISOLATED_STORAGE");
  });
  it("requires explicit isolation opt-in and service credential", () => {
    expect(() => isolatedStorageClient({ ...process.env, MEDICAL_MOTION_WORKER_ENVIRONMENT: undefined })).toThrow();
    expect(() => isolatedStorageClient({ ...process.env, MEDICAL_MOTION_WORKER_ENVIRONMENT: "isolated-test", SUPABASE_SERVICE_ROLE_KEY: undefined })).toThrow();
  });
  it.each([undefined, "postgres://user:password@production.example/organheal_ownership_test_step3c", "postgres://user:password@localhost/production", "https://localhost/organheal_ownership_test_step3c"])("rejects unsafe database configuration", url => {
    expect(() => createIsolatedMotionDatabase({ ...process.env, ORGANHEAL_OWNERSHIP_TEST_DATABASE_URL: url })).toThrow("INVALID_ISOLATED_DATABASE");
  });
  it("does not require a PostgreSQL executable", () => {
    expect(() => createIsolatedMotionDatabase({ ...process.env, ORGANHEAL_TEST_PSQL: undefined, ORGANHEAL_OWNERSHIP_TEST_DATABASE_URL: "postgres://test:test@localhost/organheal_ownership_test_step3c" })).not.toThrow();
  });
});
