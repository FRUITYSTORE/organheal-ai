import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BackgroundJobResultRepository, type PublicationRequest } from "@/lib/jobs/background-job-result.repository";

const id = "11111111-1111-4111-8111-111111111111";
const request: PublicationRequest = { jobId: id, attemptToken: id, manifest: { kind: "artifact", referenceId: id } };
function setup(data: unknown = [{ outcome: "applied", result_id: id }]) {
  const rpc = vi.fn().mockResolvedValue({ data, error: null });
  return { rpc, repository: new BackgroundJobResultRepository({ rpc } as unknown as SupabaseClient) };
}
describe("Background job publication repository", () => {
  it.each(["applied", "already-finalized"])("accepts %s with durable identity", async outcome => {
    const { rpc, repository } = setup([{ outcome, result_id: id }]);
    expect(await repository.publish(request)).toEqual({ outcome, resultId: id });
    expect(rpc).toHaveBeenCalledWith("publish_background_job_result", {
      p_job_id: id, p_attempt_token: id, p_result_kind: "artifact", p_reference_id: id,
    });
  });
  it.each(["ownership-lost", "conflict"])("distinguishes %s", async outcome => {
    expect(await setup([{ outcome, result_id: null }]).repository.publish(request)).toEqual({ outcome, resultId: null });
  });
  const invalid = [
    null, [], {}, { ...request, jobId: "invalid" }, { ...request, attemptToken: "invalid" },
    { ...request, clinical: { message: "excluded" } }, { ...request, plan: {} },
    { ...request, manifest: { ...request.manifest, plan: {} } },
    { ...request, manifest: { ...request.manifest, clinical: "excluded" } },
    { ...request, manifest: { kind: "unexpected", referenceId: id } },
    ...["C:\\private\\output.png", "/private/output.png", "../output.png", "file:///private/output.png",
      "https://storage.invalid/object", "x".repeat(65537)].map(referenceId => ({
        ...request, manifest: { kind: "artifact", referenceId },
      })),
    { ...request, manifest: { kind: "artifact" } },
    { ...request, manifest: { kind: "artifact", referenceId: { nested: id } } },
  ];
  it.each(invalid)("rejects invalid contract before RPC %#", async value => {
    const { rpc, repository } = setup();
    await expect(repository.publish(value as PublicationRequest)).rejects.toThrow("Invalid");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("rejects getters without executing them", async () => {
    const getter = vi.fn(() => id);
    const candidate = { ...request };
    Object.defineProperty(candidate, "jobId", { get: getter, enumerable: true });
    const { repository, rpc } = setup();
    await expect(repository.publish(candidate)).rejects.toThrow("Invalid");
    expect(getter).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([null, [], [{}], [{ outcome: "applied", result_id: null }],
    [{ outcome: "ownership-lost", result_id: id }], [{ outcome: "other", result_id: id }],
    [{ outcome: "applied", result_id: "bad" }], [{ outcome: "applied", result_id: id, extra: true }],
    [{ outcome: "applied", result_id: id }, { outcome: "applied", result_id: id }],
  ])("rejects malformed or empty RPC response %#", async data => {
    await expect(setup(data).repository.publish(request)).rejects.toThrow("invalid result");
  });
  it("redacts RPC error diagnostics", async () => {
    const { rpc, repository } = setup();
    rpc.mockResolvedValue({ data: null, error: { message: "sensitive submitted data" } });
    await expect(repository.publish(request)).rejects.toThrow("commit state is unknown");
  });
  it("redacts rejected transport errors", async () => {
    const { rpc, repository } = setup();
    rpc.mockRejectedValue(new Error("sensitive transport diagnostics"));
    await expect(repository.publish(request)).rejects.toThrow("commit state is unknown");
  });
  it("replays identical publication after ambiguous response, without automatic retry", async () => {
    const { rpc, repository } = setup();
    rpc.mockResolvedValueOnce({ data: null, error: { message: "lost response" } })
      .mockResolvedValueOnce({ data: [{ outcome: "already-finalized", result_id: id }], error: null });
    await expect(repository.publish(request)).rejects.toThrow("unknown");
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(await repository.publish(request)).toEqual({ outcome: "already-finalized", resultId: id });
    expect(rpc.mock.calls[0]).toEqual(rpc.mock.calls[1]);
  });
});
