import { it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { MedicalMotionExecutionContextRepository } from "../lib/medical-motion/execution-context.repository";
import { contextContent } from "./helpers/medical-motion-context";
import { profileFixture } from "./helpers/source-profile-fixture";
import { installTestOrganModuleResolution } from "./helpers/organ-module-resolution";
it("reconstruction retains an exact historical test version and refuses removal",async()=>{
 const {module}=profileFixture();module.assetVersion="TEST-historical-heart";
 const installed=installTestOrganModuleResolution(module),c=contextContent();
 const owner="11111111-1111-4111-8111-111111111111",id="22222222-2222-4222-8222-222222222222";
 const repo=new MedicalMotionExecutionContextRepository({} as SupabaseClient);
 vi.spyOn(repo,"read").mockResolvedValue({...c,assetVersion:module.assetVersion,id,userId:owner,createdAt:"2026-10-08T00:00:00Z"});
 expect((await repo.reconstruct(id,owner,0)).plan).toEqual(c.candidatePlan);
 installed.exact.mockImplementation(()=>null);
 await expect(repo.reconstruct(id,owner,0)).rejects.toThrow("CONTEXT_VERSION_UNAVAILABLE");
 expect(installed.legacy).not.toHaveBeenCalled();
});
