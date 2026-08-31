import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ProductAnalyticsEventName,
  ProductAnalyticsLanguage,
  ProductAnalyticsSource,
} from "./product-analytics.types";

export type ProductAnalyticsRecord = {
  eventName: ProductAnalyticsEventName;
  userId?: string | null;
  anonymousSessionId?: string | null;
  language?: ProductAnalyticsLanguage;
  source?: ProductAnalyticsSource;
  authenticated: boolean;
};

export class ProductAnalyticsRepository {
  constructor(
    private readonly client: SupabaseClient
  ) {}

  async insertEvent(
    event: ProductAnalyticsRecord
  ): Promise<void> {
    const { error } = await this.client
      .from("product_analytics_events")
      .insert({
        event_name: event.eventName,
        user_id: event.userId ?? null,
        anonymous_session_id:
          event.anonymousSessionId ?? null,
        language: event.language ?? null,
        source: event.source ?? null,
        authenticated: event.authenticated,
      });

    if (error) {
      throw error;
    }
  }
}