import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, expect, it } from "vitest";
import { configuration, sql } from "./helpers/medical-motion-postgres";
import { cleanupArtifactOwner } from "./helpers/medical-motion-artifacts";
import { client } from "./helpers/medical-motion-rpc";
import { contextContent } from "./helpers/medical-motion-context";
import { MedicalMotionJobRepository } from "@/lib/medical-motion/job.repository";
import { createIsolatedMotionDatabase } from "@/lib/medical-motion/worker/local-postgres";
let owner:string|undefined;
beforeAll(()=>{configuration();});
afterEach(async()=>{if(owner)await cleanupArtifactOwner(owner);});
it("read-only queue monitoring returns only counts and age without claiming jobs",async()=>{
 owner=randomUUID();await sql(`insert into auth.users(id) values('${owner}');`);
 const id=(await new MedicalMotionJobRepository(client).enqueue(owner,randomUUID(),contextContent(),0)).jobId;
 const result=await createIsolatedMotionDatabase(process.env).operationalQueueHealth();
 expect(Object.keys(result).sort()).toEqual(["oldestWaitingMs","waitingCount"]);
 expect(result.waitingCount).toBeGreaterThanOrEqual(1);expect(result.oldestWaitingMs).toBeGreaterThanOrEqual(0);
 expect(await sql(`select status from public.background_jobs where id='${id}';`)).toBe("pending");
});
