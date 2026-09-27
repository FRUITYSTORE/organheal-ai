import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import {
  toRowPayload,
  type VideoInput,
  type VideoRow,
} from "@/lib/health-videos/custom";

const TABLE = "health_videos";

export async function listAllVideos(): Promise<VideoRow[]> {
  const { data, error } = await getSupabaseAdminClient()
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error("Unable to load videos.");
  }

  return (data ?? []) as VideoRow[];
}

export async function listActiveVideos(): Promise<VideoRow[]> {
  const { data, error } = await getSupabaseAdminClient()
    .from(TABLE)
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error("Unable to load videos.");
  }

  return (data ?? []) as VideoRow[];
}

export async function createVideo(input: VideoInput): Promise<VideoRow> {
  const { data, error } = await getSupabaseAdminClient()
    .from(TABLE)
    .insert(toRowPayload(input))
    .select("*")
    .single();

  if (error || !data) {
    // 23505 = the same YouTube video was already added.
    throw new Error(error?.code === "23505" ? "duplicate" : "Unable to save the video.");
  }

  return data as VideoRow;
}

export async function updateVideo(
  id: string,
  input: VideoInput
): Promise<VideoRow | null> {
  const { data, error } = await getSupabaseAdminClient()
    .from(TABLE)
    .update({ ...toRowPayload(input), updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.code === "23505" ? "duplicate" : "Unable to save the video.");
  }

  return (data as VideoRow | null) ?? null;
}

export async function deleteVideo(id: string): Promise<void> {
  const { error } = await getSupabaseAdminClient().from(TABLE).delete().eq("id", id);

  if (error) {
    throw new Error("Unable to delete the video.");
  }
}
