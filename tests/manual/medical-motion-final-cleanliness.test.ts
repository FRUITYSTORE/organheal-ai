import { expect, it } from "vitest";
import { finalDatabaseCleanliness } from "../helpers/medical-motion-cleanliness";
import { isolatedStorageClient } from "@/lib/medical-motion/worker/entry";
import { MEDICAL_MOTION_BUCKET } from "@/lib/medical-motion/artifacts/storage";

it("real isolated database has no remaining jobs or artifact registry rows", async () => {
  const counts = await finalDatabaseCleanliness();
  console.log("ISOLATED_FINAL_COUNTS", JSON.stringify(counts));
  expect(counts).toEqual({ jobs: 0, artifacts: 0 });
});
it("real isolated private Storage bucket returns to empty state", async () => {
  const cloud = isolatedStorageClient({ ...process.env, MEDICAL_MOTION_WORKER_ENVIRONMENT: "isolated-test" });
  const bucket = await cloud.storage.getBucket(MEDICAL_MOTION_BUCKET);
  expect(bucket.error === null).toBe(true);
  expect(bucket.data?.public).toBe(false);
  const objects = await cloud.storage.from(MEDICAL_MOTION_BUCKET).list("", { limit: 1000 });
  expect(objects.error === null).toBe(true);
  expect(objects.data?.length).toBe(0);
});
