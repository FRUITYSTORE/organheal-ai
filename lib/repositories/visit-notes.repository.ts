import {
  supabase,
} from "@/lib/supabase";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

const VISIT_NOTE_SELECT =
  "id,visit_date,doctor_summary,medication_changes,follow_up_date,created_at";

export const VISIT_SUMMARY_MAX_LENGTH = 4000;
export const VISIT_MEDICATION_MAX_LENGTH = 2000;

export type VisitNote = {
  id: number;
  visit_date: string;
  doctor_summary: string;
  medication_changes: string | null;
  follow_up_date: string | null;
  created_at: string;
};

export type CreateVisitNoteInput = {
  visitDate: string;
  doctorSummary: string;
  medicationChanges?: string;
  followUpDate?: string;
};

export async function listVisitNotes(
  userId: string,
  limit = 20,
  client: SupabaseClient = supabase
): Promise<VisitNote[]> {
  const { data, error } = await client
    .from("visit_notes")
    .select(VISIT_NOTE_SELECT)
    .eq("user_id", userId)
    .order("visit_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as VisitNote[];
}

export async function createVisitNote(
  userId: string,
  input: CreateVisitNoteInput,
  client: SupabaseClient = supabase
): Promise<VisitNote> {
  const doctorSummary = input.doctorSummary.trim();
  const medicationChanges = input.medicationChanges?.trim() || null;

  if (!doctorSummary) {
    throw new Error("A visit summary is required.");
  }

  if (doctorSummary.length > VISIT_SUMMARY_MAX_LENGTH) {
    throw new Error("The visit summary is too long.");
  }

  if (
    medicationChanges &&
    medicationChanges.length > VISIT_MEDICATION_MAX_LENGTH
  ) {
    throw new Error("The medication notes are too long.");
  }

  const { data, error } = await client
    .from("visit_notes")
    .insert({
      user_id: userId,
      visit_date: input.visitDate,
      doctor_summary: doctorSummary,
      medication_changes: medicationChanges,
      follow_up_date: input.followUpDate || null,
    })
    .select(VISIT_NOTE_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as VisitNote;
}

export async function deleteVisitNote(
  userId: string,
  noteId: number,
  client: SupabaseClient = supabase
): Promise<void> {
  const { error } = await client
    .from("visit_notes")
    .delete()
    .eq("id", noteId)
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}
