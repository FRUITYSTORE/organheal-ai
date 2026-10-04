import type { ProductCapability, OfferId } from "./product-catalog";
export type ProductScope = { kind: "account"; ref: null } | { kind: "report" | "context"; ref: string };
export type EntitlementKind = "free" | "subscription" | "one-time" | "credit" | "promotional" | "admin";
export type ProductDecisionCode = "ALLOWED_FREE" | "ALLOWED_SUBSCRIPTION" | "ALLOWED_ONE_TIME" | "ALLOWED_CREDIT" |
  "DENIED_ENTITLEMENT_REQUIRED" | "DENIED_ALLOWANCE_EXHAUSTED" | "DENIED_PRODUCT_UNAVAILABLE";
export type ProductDecision = { allowed: boolean; code: ProductDecisionCode; entitlementId: string | null;
  remaining: number | null; reservationId: string | null; state: "reserved" | "consumed" | "released" | null };
export type EntitlementGrant = { capability: ProductCapability; kind: EntitlementKind; scope: ProductScope;
  validFrom: string; validUntil: string | null; allowance: number | null; sourceRef: string; offer: OfferId | null;
  purchase?: {amountMinor:number;currency:string} };
/** Units/observations only. Clinical values, prose, provider prices and IDs are forbidden. */
export type CostUnits = Partial<{ baseCacheHit: boolean; blenderAvoided: boolean; compositionExecuted: boolean;
  blenderExecutions: number; compositionExecutions: number; artifactBytes: number; aiUses: number;
  durationBand: "short" | "medium" | "long" | "unknown"; outputProfile: "16:9" | "9:16" | "1:1" }>;
export class ProductAuthorizationError extends Error {
  constructor(readonly code: "PRODUCT_INPUT_INVALID" | "PRODUCT_STATE_UNAVAILABLE") { super(code); }
}
