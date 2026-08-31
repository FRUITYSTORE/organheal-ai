export type ProductNavigationDestination =
  | "upload-report"
  | "view-results"
  | "health-plan"
  | "reports"
  | "learning"
  | "doctor-prep"
  | "profile"
  | "communication-settings";

export type ProductNavigationConfidence =
  | "high"
  | "medium"
  | "low";

export type ProductNavigationDetection = {
  matched: boolean;
  destination: ProductNavigationDestination | null;
  confidence: ProductNavigationConfidence;
  matchedKeywords: string[];
};

export type ProductNavigationAction = {
  destination: ProductNavigationDestination;
  href: string;
  label: {
    en: string;
    ar: string;
  };
};