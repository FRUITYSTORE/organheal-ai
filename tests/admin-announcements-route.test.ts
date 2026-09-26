import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockedAuthorize,
  mockedList,
  mockedCreate,
  mockedUpdate,
  mockedDelete,
} = vi.hoisted(() => ({
  mockedAuthorize: vi.fn(),
  mockedList: vi.fn(),
  mockedCreate: vi.fn(),
  mockedUpdate: vi.fn(),
  mockedDelete: vi.fn(),
}));

vi.mock("@/lib/api/api-admin-auth", () => ({
  authorizeAdminApiRequest: mockedAuthorize,
}));

vi.mock("@/lib/repositories/health-announcement.repository", () => ({
  listAllAnnouncements: mockedList,
  listActiveAnnouncements: mockedList,
  createAnnouncement: mockedCreate,
  updateAnnouncement: mockedUpdate,
  deleteAnnouncement: mockedDelete,
}));

import { DELETE, GET, POST, PUT } from "@/app/api/admin/announcements/route";
import { GET as publicGET } from "@/app/api/health-announcements/route";

const ID = "3f1c2b4a-1111-4222-8333-444455556666";

function request(method: string, body?: unknown, url = "http://x/api/admin/announcements") {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const goodBody = { title: "T", body: "B", tone: "teal" };

describe("/api/admin/announcements", () => {
  beforeEach(() => {
    mockedAuthorize.mockReset();
    mockedList.mockReset();
    mockedCreate.mockReset();
    mockedUpdate.mockReset();
    mockedDelete.mockReset();
    mockedAuthorize.mockResolvedValue({ success: true });
  });

  it("blocks non-admins on every method", async () => {
    mockedAuthorize.mockResolvedValue({ success: false, status: 403, error: "no" });

    for (const response of [
      await GET(request("GET")),
      await POST(request("POST", goodBody)),
      await PUT(request("PUT", { ...goodBody, id: ID })),
      await DELETE(request("DELETE", undefined, `http://x/a?id=${ID}`)),
    ]) {
      expect(response.status).toBe(403);
    }

    expect(mockedCreate).not.toHaveBeenCalled();
    expect(mockedUpdate).not.toHaveBeenCalled();
    expect(mockedDelete).not.toHaveBeenCalled();
  });

  it("creates a validated announcement", async () => {
    mockedCreate.mockResolvedValue({ id: ID });

    const response = await POST(request("POST", goodBody));

    expect(response.status).toBe(201);
    expect(mockedCreate).toHaveBeenCalledWith(expect.objectContaining({ title: "T", tone: "teal" }));
  });

  it("rejects invalid input without touching the database", async () => {
    const response = await POST(request("POST", { ...goodBody, tone: "neon" }));

    expect(response.status).toBe(400);
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("requires a valid id to update or delete", async () => {
    expect((await PUT(request("PUT", { ...goodBody, id: "nope" }))).status).toBe(400);
    expect((await DELETE(request("DELETE", undefined, "http://x/a?id=nope"))).status).toBe(400);
  });

  it("returns 404 when updating a missing announcement", async () => {
    mockedUpdate.mockResolvedValue(null);

    expect((await PUT(request("PUT", { ...goodBody, id: ID }))).status).toBe(404);
  });

  it("deletes by id", async () => {
    mockedDelete.mockResolvedValue(undefined);

    const response = await DELETE(request("DELETE", undefined, `http://x/a?id=${ID}`));

    expect(response.status).toBe(200);
    expect(mockedDelete).toHaveBeenCalledWith(ID);
  });
});

describe("/api/health-announcements (public)", () => {
  it("returns localized items and never fails the page", async () => {
    mockedList.mockReset();
    mockedList.mockResolvedValue([
      { id: ID, title: "Hi", body: "B", title_ar: "أهلا", body_ar: null, link_url: null, tone: "teal" },
    ]);

    const ok = await publicGET(new Request("http://x/api/health-announcements?lang=ar"));
    const okBody = await ok.json();

    expect(okBody.items[0]).toMatchObject({ title: "أهلا", body: "B" });

    mockedList.mockRejectedValue(new Error("db down"));

    const failed = await publicGET(new Request("http://x/api/health-announcements"));

    expect(failed.status).toBe(200);
    expect((await failed.json()).items).toEqual([]);
  });
});
