import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  toRowPayload,
  type AnnouncementInput,
  type AnnouncementRow,
} from "@/lib/health-updates/announcement";

const TABLE = "health_announcements";

export async function listAllAnnouncements(): Promise<AnnouncementRow[]> {
  const { data, error } = await getSupabaseAdminClient()
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Unable to load announcements.");
  }

  return (data ?? []) as AnnouncementRow[];
}

export async function listActiveAnnouncements(): Promise<AnnouncementRow[]> {
  const { data, error } = await getSupabaseAdminClient()
    .from(TABLE)
    .select("*")
    .eq("is_active", true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    throw new Error("Unable to load announcements.");
  }

  return (data ?? []) as AnnouncementRow[];
}

export async function createAnnouncement(
  input: AnnouncementInput
): Promise<AnnouncementRow> {
  const { data, error } = await getSupabaseAdminClient()
    .from(TABLE)
    .insert(toRowPayload(input))
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Unable to save the announcement.");
  }

  return data as AnnouncementRow;
}

export async function updateAnnouncement(
  id: string,
  input: AnnouncementInput
): Promise<AnnouncementRow | null> {
  const { data, error } = await getSupabaseAdminClient()
    .from(TABLE)
    .update({ ...toRowPayload(input), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error("Unable to save the announcement.");
  }

  return (data as AnnouncementRow | null) ?? null;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await getSupabaseAdminClient()
    .from(TABLE)
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error("Unable to delete the announcement.");
  }
}
