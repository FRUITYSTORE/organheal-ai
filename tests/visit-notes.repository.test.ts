import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: {},
}));

import {
  createVisitNote,
  deleteVisitNote,
  getNextFollowUpDate,
  listVisitNotes,
} from "@/lib/repositories/visit-notes.repository";

function createRecord() {
  return {
    id: 1,
    visit_date: "2026-09-20",
    doctor_summary: "Continue current plan.",
    medication_changes: null,
    follow_up_date: null,
    created_at: "2026-09-20T10:00:00.000Z",
  };
}

describe("visit notes repository", () => {
  it("lists a user's notes newest first", async () => {
    const limit = vi.fn().mockResolvedValue({
      data: [createRecord()],
      error: null,
    });
    const secondOrder = vi.fn(() => ({ limit }));
    const firstOrder = vi.fn(() => ({ order: secondOrder }));
    const eq = vi.fn(() => ({ order: firstOrder }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    const notes = await listVisitNotes("user-1", 20, { from } as never);

    expect(from).toHaveBeenCalledWith("visit_notes");
    expect(eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(firstOrder).toHaveBeenCalledWith("visit_date", {
      ascending: false,
    });
    expect(notes).toHaveLength(1);
  });

  it("trims input and stores empty optional fields as null", async () => {
    const single = vi.fn().mockResolvedValue({
      data: createRecord(),
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const insert = vi.fn(() => ({ select }));
    const from = vi.fn(() => ({ insert }));

    await createVisitNote(
      "user-1",
      {
        visitDate: "2026-09-20",
        doctorSummary: "  Continue current plan.  ",
        medicationChanges: "   ",
        followUpDate: "",
      },
      { from } as never
    );

    expect(insert).toHaveBeenCalledWith({
      user_id: "user-1",
      visit_date: "2026-09-20",
      doctor_summary: "Continue current plan.",
      medication_changes: null,
      follow_up_date: null,
    });
  });

  it("rejects an empty or oversized summary before calling the database", async () => {
    const from = vi.fn();

    await expect(
      createVisitNote(
        "user-1",
        { visitDate: "2026-09-20", doctorSummary: "   " },
        { from } as never
      )
    ).rejects.toThrow("A visit summary is required.");

    await expect(
      createVisitNote(
        "user-1",
        { visitDate: "2026-09-20", doctorSummary: "x".repeat(4001) },
        { from } as never
      )
    ).rejects.toThrow("too long");

    expect(from).not.toHaveBeenCalled();
  });

  it("finds the nearest upcoming follow-up date, ignoring past ones", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { follow_up_date: "2026-10-05" },
      error: null,
    });
    const limit = vi.fn(() => ({ maybeSingle }));
    const order = vi.fn(() => ({ limit }));
    const gte = vi.fn(() => ({ order }));
    const eq = vi.fn(() => ({ gte }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    const result = await getNextFollowUpDate("user-1", "2026-09-22", {
      from,
    } as never);

    expect(result).toBe("2026-10-05");
    expect(gte).toHaveBeenCalledWith("follow_up_date", "2026-09-22");
    expect(order).toHaveBeenCalledWith("follow_up_date", { ascending: true });
  });

  it("returns null when there is no upcoming follow-up", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const limit = vi.fn(() => ({ maybeSingle }));
    const order = vi.fn(() => ({ limit }));
    const gte = vi.fn(() => ({ order }));
    const eq = vi.fn(() => ({ gte }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));

    expect(
      await getNextFollowUpDate("user-1", "2026-09-22", { from } as never)
    ).toBeNull();
  });

  it("scopes deletes to the owning user", async () => {
    const secondEq = vi.fn().mockResolvedValue({ error: null });
    const firstEq = vi.fn(() => ({ eq: secondEq }));
    const deleteFn = vi.fn(() => ({ eq: firstEq }));
    const from = vi.fn(() => ({ delete: deleteFn }));

    await deleteVisitNote("user-1", 7, { from } as never);

    expect(firstEq).toHaveBeenCalledWith("id", 7);
    expect(secondEq).toHaveBeenCalledWith("user_id", "user-1");
  });
});
