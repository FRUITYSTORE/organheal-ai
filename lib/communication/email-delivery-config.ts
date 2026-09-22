/**
 * Whether Resend is configured to send OrganHeal-branded emails
 * (RESEND_API_KEY + a sending address in ORGANHEAL_EMAIL_FROM, which must
 * be on a domain verified in Resend). Callers use this to choose between
 * the branded flow and a safe fallback, so a route never assumes email
 * delivery is available.
 */
export function isEmailDeliveryConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() &&
      process.env.ORGANHEAL_EMAIL_FROM?.trim()
  );
}
