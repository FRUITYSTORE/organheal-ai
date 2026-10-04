import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { HealthIntelligenceResult } from "@/lib/health-intelligence/models/health-intelligence-result";
import { getUploadedReportsByIds } from "@/lib/repositories/reports.repository";
import { ProductAuthorizationService } from "./product-authorization";
import { ProductAuthorizationError } from "./product-contracts";
import { isUuid } from "@/lib/validation/uuid";
/** Projection of already-computed, owned intelligence. Payment never reruns clinical analysis. */
export function projectReportProduct(result: HealthIntelligenceResult, fullAllowed: boolean) {
  const safetyAlerts=result.findings.filter(f=>f.severity==="critical");
  const abnormalFindingsCount=result.findings.filter(f=>f.reportEvidence && ["Low","High"].includes(f.reportEvidence.markerStatus??"")).length;
  const healthPatternCount=result.patterns.status==="ready"?result.patterns.data.patterns.length:0;
  return {safetyAlerts,preview:{abnormalFindingsCount,healthPatternCount,hasRicherIntelligence:result.findings.length>0||healthPatternCount>0},
    ...(fullAllowed?{full:result}:{})};
}
export class ReportProductAccessService {
  constructor(private readonly client: SupabaseClient,private readonly authorization=new ProductAuthorizationService(client)) {}
  async reveal(owner: string,reportId: number,result: HealthIntelligenceResult,stableAnalysisRef: string) {
    if(!isUuid(owner)||!isUuid(stableAnalysisRef)||!Number.isSafeInteger(reportId)||reportId<1)throw new ProductAuthorizationError("PRODUCT_INPUT_INVALID");
    let owned;
    try {owned=await getUploadedReportsByIds(owner,[reportId],this.client);}catch{throw new ProductAuthorizationError("PRODUCT_STATE_UNAVAILABLE");}
    if(!owned.some(r=>r.id===reportId))throw new ProductAuthorizationError("PRODUCT_INPUT_INVALID");
    // Safety/preview survive commercial transport failure. Ownership errors do not.
    try {
      const d=await this.authorization.reserve(owner,"report.full-analysis",{kind:"report",ref:String(reportId)},stableAnalysisRef);
      if(d.allowed && d.reservationId && d.state!=="released") {
        const settled=await this.authorization.settle(owner,d.reservationId,"consumed","success");
        return {decision:settled==="consumed"?d.code:"DENIED_PRODUCT_UNAVAILABLE",...projectReportProduct(result,settled==="consumed")};
      }
      return {decision:d.code,...projectReportProduct(result,false)};
    } catch {return {decision:"DENIED_PRODUCT_UNAVAILABLE",...projectReportProduct(result,false)};}
  }
}
