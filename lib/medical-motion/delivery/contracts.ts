import { isUuid } from "@/lib/validation/uuid";
export type DeliveryInput = { sourceRef: string; sceneIndex: number; language: "ar" | "en"; aspectRatio: "16:9" | "9:16" | "1:1" };
export type DeliveryStatus = "queued" | "preparing" | "rendering" | "personalizing" | "ready" | "failed" | "cancelled";
export class DeliveryError extends Error {
  constructor(readonly code: "invalid-request" | "not-found" | "temporarily-unavailable" | "not-ready" | "product-use-not-allowed") { super(code); }
}
export function deliveryInput(value: unknown): DeliveryInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new DeliveryError("invalid-request");
  const v = value as Record<string, unknown>;
  if (Object.keys(v).length !== 4 || !isUuid(v.sourceRef) || !Number.isSafeInteger(v.sceneIndex) ||
    Number(v.sceneIndex) < 0 || Number(v.sceneIndex) > 1023 || v.language !== "ar" && v.language !== "en" ||
    v.aspectRatio !== "16:9" && v.aspectRatio !== "9:16" && v.aspectRatio !== "1:1") throw new DeliveryError("invalid-request");
  return { sourceRef: v.sourceRef.toLowerCase(), sceneIndex: Number(v.sceneIndex), language: v.language as DeliveryInput["language"], aspectRatio: v.aspectRatio as DeliveryInput["aspectRatio"] };
}
export type DeliverySnapshot = DeliveryInput & {
  id: string; userId: string; contextId: string; baseJobId: string; specId: string | null;
  status: DeliveryStatus; stage: "preparation" | "visualization" | "personalization" | "finalizing" | "ready" | "failed" | "cancelled" | "unavailable";
  failureCode: "medical-visualization-not-available" | "source-no-longer-eligible" | "unable-to-create-video" | null;
  baseCacheHit: boolean | null;
  createdAt: string; updatedAt: string;
};
export type DeliveryDescriptor = { artifactId: string; mediaType: "video/mp4"; duration: number;
  dimensions: { width: number; height: number }; language: "ar" | "en"; createdAt: string };
export type ProductDeliveryRequest = Pick<DeliverySnapshot, "status" | "stage" | "createdAt" | "updatedAt"> & {
  requestId: string; retryable: false; pollAfterSeconds: number | null; failureCode: DeliverySnapshot["failureCode"]; artifact?: DeliveryDescriptor;
};
