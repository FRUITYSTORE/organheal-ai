import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";

// Shotstack needs a plain, publicly-fetchable URL for every asset. Narration
// audio here is generic health-topic content (never a member's own data), so
// unlike the private reports bucket (see lib/repositories/reports.repository.ts,
// which uses signed URLs) this bucket is public by design.
const STUDIO_AUDIO_BUCKET = "studio-video-audio";

let bucketReady: Promise<void> | null = null;

async function ensureBucketExists(): Promise<void> {
  bucketReady ??= (async () => {
    const client = getSupabaseAdminClient();
    const { error } = await client.storage.createBucket(STUDIO_AUDIO_BUCKET, {
      public: true,
      fileSizeLimit: "20MB",
    });

    // Ignore "already exists" — every other error should surface.
    if (error && !/already exists/i.test(error.message)) {
      throw new Error(`Unable to prepare the audio storage bucket: ${error.message}`);
    }
  })();

  return bucketReady;
}

export async function uploadNarrationAudio(
  audio: ArrayBuffer,
  fileName: string
): Promise<string> {
  await ensureBucketExists();

  const client = getSupabaseAdminClient();
  const path = `${Date.now()}-${fileName}`;
  const { error } = await client.storage
    .from(STUDIO_AUDIO_BUCKET)
    .upload(path, audio, { contentType: "audio/mpeg", upsert: false });

  if (error) {
    throw new Error(`Unable to upload narration audio: ${error.message}`);
  }

  const { data } = client.storage.from(STUDIO_AUDIO_BUCKET).getPublicUrl(path);

  return data.publicUrl;
}
