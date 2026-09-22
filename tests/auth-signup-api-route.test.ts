import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const {
  mockedConsumePersistentApiRateLimit,
  mockedGetSupabaseAdminClient,
  mockedSupabaseSignUp,
  mockedIsEmailDeliveryConfigured,
  mockedSendEmailWithResend,
  mockedBuildSignupConfirmationEmail,
  mockedGenerateLink,
} = vi.hoisted(() => ({
  mockedConsumePersistentApiRateLimit: vi.fn(),
  mockedGetSupabaseAdminClient: vi.fn(),
  mockedSupabaseSignUp: vi.fn(),
  mockedIsEmailDeliveryConfigured: vi.fn(),
  mockedSendEmailWithResend: vi.fn(),
  mockedBuildSignupConfirmationEmail: vi.fn(),
  mockedGenerateLink: vi.fn(),
}));

vi.mock("@/lib/api/api-rate-limit", () => ({
  consumePersistentApiRateLimit: mockedConsumePersistentApiRateLimit,
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: mockedGetSupabaseAdminClient,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { signUp: mockedSupabaseSignUp } },
}));

vi.mock("@/lib/communication/email-delivery-config", () => ({
  isEmailDeliveryConfigured: mockedIsEmailDeliveryConfigured,
}));

vi.mock("@/lib/communication/resend-email.provider", () => ({
  sendEmailWithResend: mockedSendEmailWithResend,
}));

vi.mock("@/lib/communication/signup-confirmation-email.template", () => ({
  buildSignupConfirmationEmail: mockedBuildSignupConfirmationEmail,
}));

import { POST } from "@/app/api/auth/signup/route";

function createRequest(body: Record<string, unknown>): Request {
  return new Request("http://www.organheal.com/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  email: "new.patient@example.com",
  password: "Str0ngPass",
  username: "new_patient",
  fullName: "New Patient",
  dateOfBirth: null,
  sexAtBirth: null,
  language: "en",
};

describe("POST /api/auth/signup", () => {
  beforeEach(() => {
    mockedConsumePersistentApiRateLimit.mockReset();
    mockedGetSupabaseAdminClient.mockReset();
    mockedSupabaseSignUp.mockReset();
    mockedIsEmailDeliveryConfigured.mockReset();
    mockedSendEmailWithResend.mockReset();
    mockedBuildSignupConfirmationEmail.mockReset();
    mockedGenerateLink.mockReset();

    mockedConsumePersistentApiRateLimit.mockResolvedValue({
      allowed: true,
      limit: 5,
      remaining: 4,
      resetAt: 0,
      retryAfterSeconds: 0,
    });

    mockedGetSupabaseAdminClient.mockReturnValue({
      auth: { admin: { generateLink: mockedGenerateLink } },
    });

    mockedBuildSignupConfirmationEmail.mockReturnValue({
      subject: "Confirm your email for OrganHeal",
      text: "confirm text",
      html: "<p>confirm html</p>",
    });
  });

  it("rejects an invalid email address", async () => {
    const response = await POST(
      createRequest({ ...validBody, email: "not-an-email" })
    );

    expect(response.status).toBe(400);
    expect(mockedGenerateLink).not.toHaveBeenCalled();
  });

  it("rejects a weak password", async () => {
    const response = await POST(
      createRequest({ ...validBody, password: "short" })
    );

    expect(response.status).toBe(400);
  });

  it("rejects an invalid username", async () => {
    const response = await POST(
      createRequest({ ...validBody, username: "a" })
    );

    expect(response.status).toBe(400);
  });

  it("returns 429 with retry-after once the visitor's rate limit is used up", async () => {
    mockedConsumePersistentApiRateLimit.mockResolvedValue({
      allowed: false,
      limit: 5,
      remaining: 0,
      resetAt: 0,
      retryAfterSeconds: 900,
    });

    const response = await POST(createRequest(validBody));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("900");
    expect(mockedGenerateLink).not.toHaveBeenCalled();
  });

  describe("when Resend is configured", () => {
    beforeEach(() => {
      mockedIsEmailDeliveryConfigured.mockReturnValue(true);
    });

    it("creates the user, emails a self-hosted confirmation link, and never calls Supabase's own signUp", async () => {
      mockedGenerateLink.mockResolvedValue({
        data: {
          user: { id: "user-123" },
          properties: { hashed_token: "hashed-token-abc" },
        },
        error: null,
      });

      mockedSendEmailWithResend.mockResolvedValue({
        messageId: "email-1",
        recipient: validBody.email,
        from: "OrganHeal AI <noreply@organheal.com>",
      });

      const response = await POST(createRequest(validBody));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ success: true });

      expect(mockedGenerateLink).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "signup",
          email: validBody.email,
          password: validBody.password,
          options: expect.objectContaining({
            data: expect.objectContaining({
              username: validBody.username,
              full_name: validBody.fullName,
            }),
          }),
        })
      );

      const emailArgs = mockedSendEmailWithResend.mock.calls[0][0];

      expect(emailArgs.to).toBe(validBody.email);
      expect(emailArgs.idempotencyKey).toBe(
        "signup-confirmation:user-123"
      );

      const confirmUrlArg =
        mockedBuildSignupConfirmationEmail.mock.calls[0][0].confirmUrl;

      expect(confirmUrlArg).toContain(
        "www.organheal.com/verify?token_hash=hashed-token-abc"
      );
      expect(confirmUrlArg).toContain("type=signup");

      // The whole point of this route is that Supabase's own confirmation
      // email is never sent when the branded one can be.
      expect(mockedSupabaseSignUp).not.toHaveBeenCalled();
    });

    it("does not send an email when generateLink fails, and reports an error", async () => {
      mockedGenerateLink.mockResolvedValue({
        data: null,
        error: { message: "duplicate email" },
      });

      const response = await POST(createRequest(validBody));

      expect(response.status).toBe(400);
      expect(mockedSendEmailWithResend).not.toHaveBeenCalled();
    });

    it("reports a distinct error when the account was created but the email failed to send", async () => {
      mockedGenerateLink.mockResolvedValue({
        data: {
          user: { id: "user-456" },
          properties: { hashed_token: "hashed-token-xyz" },
        },
        error: null,
      });

      mockedSendEmailWithResend.mockRejectedValue(
        new Error("Resend API down")
      );

      const response = await POST(createRequest(validBody));
      const body = await response.json();

      expect(response.status).toBe(502);
      expect(body.success).toBe(false);
      expect(body.error).toMatch(/account was created/i);
    });

    it("sends the Arabic-language confirmation email when the request language is Arabic", async () => {
      mockedGenerateLink.mockResolvedValue({
        data: {
          user: { id: "user-789" },
          properties: { hashed_token: "hashed-token-ar" },
        },
        error: null,
      });

      mockedSendEmailWithResend.mockResolvedValue({
        messageId: "email-2",
        recipient: validBody.email,
        from: "OrganHeal AI <noreply@organheal.com>",
      });

      await POST(createRequest({ ...validBody, language: "ar" }));

      expect(mockedBuildSignupConfirmationEmail).toHaveBeenCalledWith(
        expect.objectContaining({ language: "ar" })
      );
    });
  });

  describe("when Resend is not configured", () => {
    beforeEach(() => {
      mockedIsEmailDeliveryConfigured.mockReturnValue(false);
    });

    it("falls back to Supabase's own signUp so account creation keeps working", async () => {
      mockedSupabaseSignUp.mockResolvedValue({
        data: { user: { id: "user-fallback" } },
        error: null,
      });

      const response = await POST(createRequest(validBody));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({ success: true });

      expect(mockedSupabaseSignUp).toHaveBeenCalledWith(
        expect.objectContaining({
          email: validBody.email,
          password: validBody.password,
          options: expect.objectContaining({
            emailRedirectTo: "http://www.organheal.com/login",
          }),
        })
      );

      expect(mockedGenerateLink).not.toHaveBeenCalled();
      expect(mockedSendEmailWithResend).not.toHaveBeenCalled();
    });

    it("reports an error when the fallback signUp fails", async () => {
      mockedSupabaseSignUp.mockResolvedValue({
        data: null,
        error: { message: "Email already registered" },
      });

      const response = await POST(createRequest(validBody));

      expect(response.status).toBe(400);
    });
  });
});
