import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import {
  createNotification,
  type CreateNotificationInput,
  type Notification,
} from "@/lib/notifications/notification";

import {
  saveNotification,
} from "@/lib/repositories/notification.repository";

export type CreateAndSaveNotificationInput =
  CreateNotificationInput & {
    client:
      SupabaseClient;
  };

export type CreateAndSaveNotificationResult = {
  notification:
    Notification;

  created:
    boolean;
};

export async function createAndSaveNotification({
  client,
  ...input
}: CreateAndSaveNotificationInput):
  Promise<
    CreateAndSaveNotificationResult
  > {
  const notification =
    createNotification(
      input
    );

  const result =
    await saveNotification(
      notification,
      client
    );

  return {
    notification:
      result.notification,

    created:
      result.created,
  };
}