import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock(
  "@/lib/supabase",
  () => ({
    supabase: {},
  })
);

import {
  createDefaultCommunicationPreferences,
  getCommunicationPreferences,
  getOrCreateCommunicationPreferences,
  updateCommunicationPreferences,
} from "@/lib/repositories/communication-preferences.repository";

function createPreferencesRecord() {
  return {
    user_id:
      "user-1",

    preferred_language:
      "en",

    timezone:
      "UTC",

    dashboard_enabled:
      true,

    email_enabled:
      false,

    whatsapp_enabled:
      false,

    push_enabled:
      false,

    whatsapp_phone_e164:
      null,

    whatsapp_phone_verified_at:
      null,

    email_consent_granted_at:
      null,

    email_consent_revoked_at:
      null,

    whatsapp_consent_granted_at:
      null,

    whatsapp_consent_revoked_at:
      null,

    push_consent_granted_at:
      null,

    push_consent_revoked_at:
      null,

    consent_source:
      null,

    consent_version:
      null,

    created_at:
      "2026-08-21T10:00:00.000Z",

    updated_at:
      "2026-08-21T10:00:00.000Z",
  };
}

function createSelectClient(
  data:
    unknown,
  error:
    { message: string } | null = null
) {
  const maybeSingle =
    vi.fn(
      async () => ({
        data,
        error,
      })
    );

  const eq =
    vi.fn(
      () => ({
        maybeSingle,
      })
    );

  const select =
    vi.fn(
      () => ({
        eq,
      })
    );

  const from =
    vi.fn(
      () => ({
        select,
      })
    );

  return {
    client: {
      from,
    } as any,

    from,
    select,
    eq,
    maybeSingle,
  };
}

describe(
  "communication-preferences.repository",
  () => {
    it(
      "loads communication preferences for a user",
      async () => {
        const record =
          createPreferencesRecord();

        const {
          client,
          from,
          select,
          eq,
        } =
          createSelectClient(
            record
          );

        const result =
          await getCommunicationPreferences(
            "user-1",
            client
          );

        expect(
          from
        ).toHaveBeenCalledWith(
          "communication_preferences"
        );

        expect(
          eq
        ).toHaveBeenCalledWith(
          "user_id",
          "user-1"
        );

        expect(
          result
        ).toEqual(
          record
        );
      }
    );

    it(
      "returns null when preferences do not exist",
      async () => {
        const {
          client,
        } =
          createSelectClient(
            null
          );

        const result =
          await getCommunicationPreferences(
            "user-1",
            client
          );

        expect(
          result
        ).toBeNull();
      }
    );

    it(
      "throws when loading preferences fails",
      async () => {
        const {
          client,
        } =
          createSelectClient(
            null,
            {
              message:
                "database failure",
            }
          );

        await expect(
          getCommunicationPreferences(
            "user-1",
            client
          )
        ).rejects.toThrow(
          "database failure"
        );
      }
    );

    it(
      "rejects an empty user id",
      async () => {
        const {
          client,
        } =
          createSelectClient(
            null
          );

        await expect(
          getCommunicationPreferences(
            "   ",
            client
          )
        ).rejects.toThrow(
          "A valid user ID is required."
        );
      }
    );

    it(
      "creates default communication preferences",
      async () => {
        const record =
          createPreferencesRecord();

        const single =
          vi.fn(
            async () => ({
              data:
                record,

              error:
                null,
            })
          );

        const select =
          vi.fn(
            () => ({
              single,
            })
          );

        const upsert =
          vi.fn(
            () => ({
              select,
            })
          );

        const from =
          vi.fn(
            () => ({
              upsert,
            })
          );

        const client = {
          from,
        } as any;

        const result =
          await createDefaultCommunicationPreferences(
            {
              userId:
                "user-1",

              preferredLanguage:
                "en",

              timezone:
                "Asia/Dubai",
            },
            client
          );

        expect(
          upsert
        ).toHaveBeenCalledWith(
          {
            user_id:
              "user-1",

            preferred_language:
              "en",

            timezone:
              "Asia/Dubai",

            dashboard_enabled:
              true,
          },
          {
            onConflict:
              "user_id",

            ignoreDuplicates:
              true,
          }
        );

        expect(
          result
        ).toEqual(
          record
        );
      }
    );

    it(
      "returns existing preferences without creating duplicates",
      async () => {
        const record =
          createPreferencesRecord();

        const maybeSingle =
          vi.fn(
            async () => ({
              data:
                record,

              error:
                null,
            })
          );

        const eq =
          vi.fn(
            () => ({
              maybeSingle,
            })
          );

        const select =
          vi.fn(
            () => ({
              eq,
            })
          );

        const upsert =
          vi.fn();

        const from =
          vi.fn(
            () => ({
              select,
              upsert,
            })
          );

        const client = {
          from,
        } as any;

        const result =
          await getOrCreateCommunicationPreferences(
            {
              userId:
                "user-1",
            },
            client
          );

        expect(
          result
        ).toEqual(
          record
        );

        expect(
          upsert
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "updates communication preferences",
      async () => {
        const updatedRecord = {
          ...createPreferencesRecord(),

          whatsapp_enabled:
            true,

          whatsapp_phone_e164:
            "+971501234567",

          whatsapp_consent_granted_at:
            "2026-08-21T11:00:00.000Z",

          consent_source:
            "profile-settings",

          consent_version:
            "v1",
        };

        const maybeSingle =
          vi.fn(
            async () => ({
              data:
                updatedRecord,

              error:
                null,
            })
          );

        const select =
          vi.fn(
            () => ({
              maybeSingle,
            })
          );

        const eq =
          vi.fn(
            () => ({
              select,
            })
          );

        const update =
          vi.fn(
            () => ({
              eq,
            })
          );

        const from =
          vi.fn(
            () => ({
              update,
            })
          );

        const client = {
          from,
        } as any;

        const result =
          await updateCommunicationPreferences(
            "user-1",
            {
              whatsappEnabled:
                true,

              whatsappPhoneE164:
                "+971501234567",

              whatsappConsentGrantedAt:
                "2026-08-21T11:00:00.000Z",

              consentSource:
                "profile-settings",

              consentVersion:
                "v1",
            },
            client
          );

        expect(
          update
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            whatsapp_enabled:
              true,

            whatsapp_phone_e164:
              "+971501234567",

            whatsapp_consent_granted_at:
              "2026-08-21T11:00:00.000Z",

            consent_source:
              "profile-settings",

            consent_version:
              "v1",
          })
        );

        expect(
          result
        ).toEqual(
          updatedRecord
        );
      }
    );

    it(
      "returns existing preferences when no updates are supplied",
      async () => {
        const record =
          createPreferencesRecord();

        const {
          client,
        } =
          createSelectClient(
            record
          );

        const result =
          await updateCommunicationPreferences(
            "user-1",
            {},
            client
          );

        expect(
          result
        ).toEqual(
          record
        );
      }
    );

    it(
      "throws when an update target is not found",
      async () => {
        const maybeSingle =
          vi.fn(
            async () => ({
              data:
                null,

              error:
                null,
            })
          );

        const select =
          vi.fn(
            () => ({
              maybeSingle,
            })
          );

        const eq =
          vi.fn(
            () => ({
              select,
            })
          );

        const update =
          vi.fn(
            () => ({
              eq,
            })
          );

        const client = {
          from:
            vi.fn(
              () => ({
                update,
              })
            ),
        } as any;

        await expect(
          updateCommunicationPreferences(
            "user-1",
            {
              dashboardEnabled:
                false,
            },
            client
          )
        ).rejects.toThrow(
          "Communication preferences were not found."
        );
      }
    );
  }
);