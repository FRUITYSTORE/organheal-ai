import { it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { prepareCompositionScene } from "../lib/medical-motion/composition/authorization";
import { MedicalMotionExecutionContextRepository } from "../lib/medical-motion/execution-context.repository";
import { contextContent } from "./helpers/medical-motion-context";
it("composition rejects an unavailable historical asset with COMPOSITION_INVALID",async()=>{
 const c=contextContent(),owner="11111111-1111-4111-8111-111111111111",id="22222222-2222-4222-8222-222222222222";
 vi.spyOn(MedicalMotionExecutionContextRepository.prototype,"read").mockResolvedValue({...c,assetVersion:"heart-unknown-test-version",id,userId:owner,createdAt:"2026-10-08T00:00:00Z"});
 await expect(prepareCompositionScene({} as SupabaseClient,owner,id,0,"development")).rejects.toThrow("COMPOSITION_INVALID");
});
