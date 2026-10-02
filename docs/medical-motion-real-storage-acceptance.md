# Isolated real Storage provider acceptance

Run only against the explicitly approved dedicated project
`organheal-medical-motion-test`, with its test credentials injected into the
process. Do not load production credentials or replace the application env file.
The manual suite checks the exact approved host, HTTPS, absence of URL credentials
and difference from the application configuration before any request. Every HTTP
request has a host allowlist and rejects redirects. PostgreSQL independently
requires localhost/127.0.0.1 and `organheal_ownership_test_step3c`.

Required existing variables: `NEXT_PUBLIC_SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`ORGANHEAL_OWNERSHIP_TEST_DATABASE_URL`, `ORGANHEAL_TEST_PSQL`.
Never print values. The private test bucket must already be
`medical-motion-artifacts`. Blender uses the existing approved development smoke
fixture; this proves infrastructure, not medical quality or production anatomy.

```powershell
npx vitest run tests/manual/medical-motion-real-storage.acceptance.test.ts --no-file-parallelism
```

The suite uses the actual production Storage adapter and real Supabase cloud
Storage, paired with local PostgreSQL 17.11 for context/job/artifact/result data.
Remote application tables are not used. A synthetic ordinary Auth user is created
for privacy tests, signed out and deleted afterward. Objects are opaque UUIDs;
only objects confirmed as written by this run are deleted, followed by readback
absence checks. An unknown write outcome preserves its registry/local resources
and stops further writes. No broad bucket deletion, production connection,
public URL creation, dependency installation or remote schema change is performed.

Evidence covers real PNG and Blender MP4, byte/digest/MIME readback, private
public/anonymous/authenticated denial, client and service overwrite prevention,
identical replay, conflicting bytes, orphan invisibility, cross-owner application
denial, real registry/FK linkage, fenced publication, completion/replay, stale
ownership, late-upload cancellation and safe error normalization. Lost-response
tests throw at the caller after a real successful write/commit; they do not claim
network-level packet-loss injection. Provider service version is not exposed;
the installed Supabase and Storage SDKs are 2.112.3.

A real cancellation defect was found: aborting post-upload readback could produce
`ARTIFACT_STORAGE_UNAVAILABLE`. The service now maps a rejected read with an
aborted trusted signal to `ARTIFACT_OWNERSHIP_LOST`. Publication was already
prevented; the correction preserves the intended failure classification and
avoids treating cancellation as a transient provider fault. Dedicated local
regression coverage reproduces that rejection without a network dependency.

One intermediate Blender rerun lacked a published artifact; subsequent complete
provider runs passed. Production worker stability and observability remain
deployment acceptance work. No claim is made about immediate upload cancellation,
provider disaster recovery/retention guarantees, medically approved anatomy,
production deployment or user-facing delivery.

This evidence supersedes the earlier filesystem/SDK-only provider limitation in
`medical-motion-durable-artifacts.md`; those original tests remain useful.

Final acceptance on 2026-10-02: 15/15 real provider tests and 992/992 relevant
regression tests passed, with 0 failures and 0 skips in the final complete runs
(1007 distinct tests). This includes the local Blender suite and one additional
real Storage/Blender flow. TypeScript, the 91-page build and whitespace checks
passed. Final read-only bucket inventory was empty; no unknown object was deleted.
