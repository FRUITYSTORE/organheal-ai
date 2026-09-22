export type SignupConfirmationEmailContent = {
  subject: string;
  text: string;
  html: string;
};

/**
 * The branded "confirm your email" message sent through OrganHeal's own
 * Resend account, so the message — sender, subject, and the page the link
 * opens — all stay on organheal.com instead of a generic Supabase email.
 */
export function buildSignupConfirmationEmail({
  confirmUrl,
  language,
}: {
  confirmUrl: string;
  language: "en" | "ar";
}): SignupConfirmationEmailContent {
  const isArabic = language === "ar";

  const subject = isArabic
    ? "أكّد بريدك الإلكتروني في OrganHeal"
    : "Confirm your email for OrganHeal";

  const heading = isArabic
    ? "أهلاً بك في OrganHeal"
    : "Welcome to OrganHeal";

  const body = isArabic
    ? "خطوة واحدة تفصلك عن البدء: أكّد بريدك الإلكتروني لتفعيل حسابك."
    : "One step left to get started: confirm your email to activate your account.";

  const button = isArabic ? "تأكيد البريد الإلكتروني" : "Confirm email";

  const fallbackNote = isArabic
    ? "إذا لم يعمل الزر، انسخ هذا الرابط والصقه في متصفحك:"
    : "If the button doesn't work, copy and paste this link into your browser:";

  const expiryNote = isArabic
    ? "ينتهي هذا الرابط خلال 24 ساعة. إذا لم تُنشئ هذا الحساب، يمكنك تجاهل هذه الرسالة بأمان."
    : "This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.";

  const footer = isArabic
    ? "فريق OrganHeal AI"
    : "The OrganHeal AI team";

  const text = [heading, "", body, "", confirmUrl, "", expiryNote, "", footer].join(
    "\n"
  );

  const html = `<!DOCTYPE html>
<html lang="${isArabic ? "ar" : "en"}" dir="${isArabic ? "rtl" : "ltr"}">
  <body style="margin:0;padding:0;background-color:#f6f8fb;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f6f8fb;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 18px 50px rgba(15,23,42,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#061826 0%,#0f766e 100%);padding:28px 32px;text-align:${
                isArabic ? "right" : "left"
              };">
                <span style="color:#ffffff;font-size:20px;font-weight:800;">Organ<span style="color:#5eead4;">Heal</span></span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;text-align:${isArabic ? "right" : "left"};">
                <h1 style="margin:0 0 12px;color:#0f172a;font-size:22px;line-height:1.3;">${heading}</h1>
                <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7;">${body}</p>
                <div style="text-align:center;margin:0 0 24px;">
                  <a href="${confirmUrl}" style="display:inline-block;padding:14px 32px;background-color:#0f766e;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;border-radius:999px;">${button}</a>
                </div>
                <p style="margin:0 0 6px;color:#94a3b8;font-size:12px;line-height:1.6;">${fallbackNote}</p>
                <p style="margin:0 0 24px;color:#0f766e;font-size:12px;line-height:1.6;word-break:break-all;">${confirmUrl}</p>
                <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">${expiryNote}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background-color:#f9fbfd;text-align:${
                isArabic ? "right" : "left"
              };">
                <p style="margin:0;color:#94a3b8;font-size:12px;">${footer}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}
