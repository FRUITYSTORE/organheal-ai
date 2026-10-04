import { describe,it,expect,vi } from "vitest";
import { randomUUID } from "node:crypto";
import type { HealthIntelligenceResult } from "../lib/health-intelligence/models/health-intelligence-result";
import type { SupabaseClient } from "@supabase/supabase-js";
import { projectReportProduct,ReportProductAccessService } from "../lib/billing/report-product-access";
import { ProductAuthorizationService } from "../lib/billing/product-authorization";
const m=vi.hoisted(()=>({reports:vi.fn()}));vi.mock("../lib/repositories/reports.repository",()=>({getUploadedReportsByIds:m.reports}));
const computed={findings:[{id:"critical",severity:"critical",title:"TEST warning",reportEvidence:{markerStatus:"High"}},
 {id:"low",severity:"warning",reportEvidence:{markerStatus:"Low"}},{id:"normal",severity:"info",reportEvidence:{markerStatus:"Normal"}}],
 patterns:{status:"ready",data:{patterns:[{id:"computed-pattern"}]}}} as unknown as HealthIntelligenceResult;
describe("report reveal foundation / safety outside commerce",()=>{
 it("preview counts derive solely from computed evidence",()=>{expect(projectReportProduct(computed,false).preview).toEqual({abnormalFindingsCount:2,healthPatternCount:1,hasRicherIntelligence:true});});
 it("safety warning remains identical with and without full entitlement",()=>{expect(projectReportProduct(computed,false).safetyAlerts).toEqual(projectReportProduct(computed,true).safetyAlerts);expect(projectReportProduct(computed,false)).not.toHaveProperty("full");});
 it("full reveal reuses the computed intelligence without analysis",()=>{expect(projectReportProduct(computed,true).full).toBe(computed);});
 it("empty computed evidence never fabricates preview counts",()=>{const r={findings:[],patterns:{status:"insufficient-data",data:{patterns:[]}}} as unknown as HealthIntelligenceResult;expect(projectReportProduct(r,false).preview).toEqual({abnormalFindingsCount:0,healthPatternCount:0,hasRicherIntelligence:false});});
 it("ownership is checked before commercial reservation",async()=>{m.reports.mockResolvedValue([]);const reserve=vi.fn(),s=new ReportProductAccessService({} as SupabaseClient,{reserve} as unknown as ProductAuthorizationService);await expect(s.reveal(randomUUID(),1,computed,randomUUID())).rejects.toThrow();expect(reserve).not.toHaveBeenCalled();});
 it("commercial outage does not hide an already determined critical alert",async()=>{m.reports.mockResolvedValue([{id:1}]);const s=new ReportProductAccessService({} as SupabaseClient,{reserve:async()=>{throw Error();}} as unknown as ProductAuthorizationService);const out=await s.reveal(randomUUID(),1,computed,randomUUID());expect(out.safetyAlerts).toHaveLength(1);expect(out).not.toHaveProperty("full");});
 it("release winning a reveal race cannot reveal premium intelligence",async()=>{m.reports.mockResolvedValue([{id:1}]);const s=new ReportProductAccessService({} as SupabaseClient,{reserve:async()=>({allowed:true,reservationId:randomUUID(),state:"reserved",code:"ALLOWED_ONE_TIME"}),settle:async()=>"released"} as unknown as ProductAuthorizationService);expect(await s.reveal(randomUUID(),1,computed,randomUUID())).not.toHaveProperty("full");});
});
