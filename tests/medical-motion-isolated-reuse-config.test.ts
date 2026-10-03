import {describe,it,expect,vi,afterEach} from "vitest";
import {readIsolatedReuseConfig} from "../lib/medical-motion/worker/config";
import {createIsolatedMotionDatabase} from "../lib/medical-motion/worker/local-postgres";
import * as transport from "../lib/medical-motion/worker/postgres-transport";
describe("isolated-only trusted reuse activation",()=>{
  afterEach(()=>vi.restoreAllMocks());
  it.each([undefined,"disabled"])("missing/disabled %s preserves normal rendering",value=>expect(readIsolatedReuseConfig({MEDICAL_MOTION_WORKER_REUSE:value})).toBe(false));
  it("explicit isolated activation",()=>expect(readIsolatedReuseConfig({MEDICAL_MOTION_WORKER_ENVIRONMENT:"isolated-test",MEDICAL_MOTION_WORKER_REUSE:"enabled"})).toBe(true));
  it.each(["true","1","","ENABLED","unknown"])("invalid value %s fails closed",value=>expect(()=>readIsolatedReuseConfig({MEDICAL_MOTION_WORKER_ENVIRONMENT:"isolated-test",MEDICAL_MOTION_WORKER_REUSE:value})).toThrow("INVALID_WORKER_CONFIGURATION"));
  it.each([undefined,"production"])("cannot enable outside isolated environment %s",value=>expect(()=>readIsolatedReuseConfig({MEDICAL_MOTION_WORKER_ENVIRONMENT:value,MEDICAL_MOTION_WORKER_REUSE:"enabled"})).toThrow("INVALID_WORKER_CONFIGURATION"));
  it("enabled cache fails readiness when its migration is unavailable",async()=>{
    vi.spyOn(transport,"isolatedPostgresQuery").mockResolvedValueOnce("17.11").mockResolvedValueOnce("t").mockResolvedValueOnce("f");
    await expect(createIsolatedMotionDatabase(process.env).readiness(true)).rejects.toThrow("WORKER_CACHE_SCHEMA_UNAVAILABLE");
  });
  it("disabled cache does not require the cache schema",async()=>{
    const query=vi.spyOn(transport,"isolatedPostgresQuery").mockResolvedValueOnce("17.11").mockResolvedValueOnce("t");
    expect(await createIsolatedMotionDatabase(process.env).readiness(false)).toBe(true);expect(query).toHaveBeenCalledTimes(2);
  });
});
