import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";
import type { ShotstackEnvironment, ShotstackRenderStatus } from "@/lib/video-studio/shotstack.client";

const TABLE = "studio_videos";

export type StudioVideoRow = {
  id: string;
  topic: string;
  title: string | null;
  status: ShotstackRenderStatus;
  shotstack_render_id: string | null;
  shotstack_environment: ShotstackEnvironment;
  output_url: string | null;
  error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export async function createStudioVideo(input: {
  topic: string;
  createdBy: string;
}): Promise<StudioVideoRow> {
  const { data, error } = await getSupabaseAdminClient()
    .from(TABLE)
    .insert({ topic: input.topic, created_by: input.createdBy })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Unable to create the studio video record.");
  }

  return data as StudioVideoRow;
}

export async function updateStudioVideo(
  id: string,
  changes: Partial<
    Pick<
      StudioVideoRow,
      "title" | "status" | "shotstack_render_id" | "output_url" | "error_message"
    >
  >
): Promise<void> {
  const { error } = await getSupabaseAdminClient()
    .from(TABLE)
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error("Unable to update the studio video record.");
  }
}

export async function listRecentStudioVideos(limit = 30): Promise<StudioVideoRow[]> {
  const { data, error } = await getSupabaseAdminClient()
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error("Unable to load studio videos.");
  }

  return (data ?? []) as StudioVideoRow[];
}

export async function getStudioVideo(id: string): Promise<StudioVideoRow | null> {
  const { data, error } = await getSupabaseAdminClient()
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load the studio video.");
  }

  return (data as StudioVideoRow | null) ?? null;
}
