/** Presentation/commercial configuration, never clinical authority. No final quota numbers. */
export const PRODUCT_CAPABILITIES = {
  "safety.alerts": { free: true }, "report.preview": { free: true },
  "report.full-analysis": { free: false }, "assistant.advanced": { free: false },
  "health-intelligence.full": { free: false }, "doctor-brief": { free: false },
  "patient-pdf": { free: false }, "medical-motion.personalized": { free: false },
  "history.extended": { free: false }, "trends": { free: false }, "health-passport": { free: false },
  "future.family-profile": { free: false },
} as const;
export type ProductCapability = keyof typeof PRODUCT_CAPABILITIES;
export const PLUS_CAPABILITIES: readonly ProductCapability[] = Object.keys(PRODUCT_CAPABILITIES)
  .filter(k => k !== "future.family-profile" && !PRODUCT_CAPABILITIES[k as ProductCapability].free) as ProductCapability[];
export const COMMERCIAL_OFFERS = {
  "one-time-analysis": { currency: "USD", amountMinor: 799, interval: null, planning: true },
  "plus-monthly": { currency: "USD", amountMinor: 999, interval: "month", planning: true },
  // Preserves the existing UI's annual planning value; no annual checkout added here.
  "plus-annual": { currency: "USD", amountMinor: 9900, interval: "year", planning: true },
} as const;
export type OfferId = keyof typeof COMMERCIAL_OFFERS;
export const planningAmount = (offer: OfferId) => (COMMERCIAL_OFFERS[offer].amountMinor / 100).toFixed(2).replace(/\.00$/, "");
export const planningAnnualSavingsPercent = () => Math.round(100*(1-COMMERCIAL_OFFERS["plus-annual"].amountMinor/(12*COMMERCIAL_OFFERS["plus-monthly"].amountMinor)));
export function isCapability(v: unknown): v is ProductCapability {
  return typeof v === "string" && Object.hasOwn(PRODUCT_CAPABILITIES,v);
}
