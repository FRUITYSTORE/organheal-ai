import type {
  AssistantResponseConversationMessage,
} from "@/lib/health-intelligence/application/assistant-response.service";

import type {
  ProductNavigationDestination,
} from "@/lib/health-intelligence/application/product-navigation/product-navigation.types";

export type AssistantSemanticDomain =
  | "product_navigation"
  | "clinical_question"
  | "health_journey"
  | "general_health"
  | "unclear";

export type AssistantSemanticConfidence =
  | "high"
  | "medium"
  | "low";

export type AssistantSemanticSource =
  | "deterministic"
  | "model";

export type AssistantSemanticRoutingDecision = {
  domain:
    AssistantSemanticDomain;

  confidence:
    AssistantSemanticConfidence;

  source:
    AssistantSemanticSource;

  productDestination:
    ProductNavigationDestination | null;

  requiresConversationContext:
    boolean;

  reason:
    string | null;
};

export type AssistantSemanticRoutingInput = {
  currentMessage:
    string;

  language:
    "en" | "ar";

  conversation:
    AssistantResponseConversationMessage[];

  deterministicDecision:
    AssistantSemanticRoutingDecision;
};