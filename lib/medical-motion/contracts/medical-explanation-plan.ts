export type ExplanationDepth="QUICK"|"STANDARD"|"DETAILED"|"COMPREHENSIVE";
export type ExplanationRequestType="EXPLAIN_THIS_RESULT"|"EXPLAIN_THIS_ORGAN"|"EXPLAIN_RISK"|"EXPLAIN_TREND"|
  "EXPLAIN_SYMPTOM_SAFELY"|"EXPLAIN_NEXT_ACTION"|"GENERAL_MEDICAL_EDUCATION";
export type MedicalEvidenceAuthority="USER_STATED"|"LAB_VERIFIED"|"REPORT_VERIFIED"|"SYSTEM_DERIVED"|
  "RISK_ESTIMATE"|"CONFIRMED_DIAGNOSIS"|"EDUCATIONAL_CONTEXT";
export type ExplanationEvidence=Readonly<{reference:string;authority:MedicalEvidenceAuthority;topic:string}>;
export type ExplanationRequest=Readonly<{requestType:ExplanationRequestType;organ:"heart"|"kidney";
  audienceMode:"PATIENT"|"DOCTOR"|"CREATOR";lane:"PERSONAL_HEALTH_MOTION"|"MEDICAL_CREATOR_MOTION";
  explanationDepth:ExplanationDepth;language:"ar"|"en";teachingTargets:readonly string[];
  safetyQualifierCount:number;crossOrganDependencyCount:number;terminologyDensity:"LOW"|"MODERATE"|"HIGH";
  requiresComparison:boolean;requiresNextAction:boolean;estimatedNarrationWords:number}>;
export type ExplanationPhase="ESTABLISH"|"ORIENT"|"APPROACH"|"FOCUS"|"EXPLAIN"|"REORIENT";
export type ExplanationScene=Readonly<{phase:ExplanationPhase;target:string|null;durationSeconds:number;
  visualStrategy:"LOCKED_MASTER_REUSE"|"NARRATION_ONLY";masterId:string|null;
  highlightAllowed:false;pathology:false;motionSpeedRatio:1}>;
