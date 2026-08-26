// Email delivery via SendGrid (transactional + broadcast).
//
// Uses the SendGrid v3 Mail Send API directly (no SDK dependency) so it works
// on serverless without installing extra packages. Configure via env:
//   SENDGRID_API_KEY  – SendGrid API key (required)
//   SENDGRID_FROM     – verified sender email (required)
//
// If SendGrid is not configured, calls are no-ops that report `skipped` so the
// rest of the flow (in-app notification, Telegram, SMS) is unaffected.

const SENDGRID_API_BASE = "https://api.sendgrid.com/v3/mail/send";

export function isEmailConfigured(): boolean {
  return Boolean((process.env.SENDGRID_API_KEY || "").trim() && (process.env.SENDGRID_FROM || "").trim());
}

export type EmailResult = { success: boolean; error?: string };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<EmailResult> {
  const apiKey = (process.env.SENDGRID_API_KEY || "").trim();
  const from = (process.env.SENDGRID_FROM || "").trim();
  if (!apiKey || !from) return { success: false, error: "Email (SendGrid) not configured" };
  const to = (opts.to || "").trim();
  if (!to || !EMAIL_RE.test(to)) return { success: false, error: "Invalid recipient email" };
  try {
    const res = await fetch(SENDGRID_API_BASE, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: from },
        subject: opts.subject.slice(0, 255),
        content: [
          { type: "text/plain", value: opts.text },
          { type: "text/html", value: opts.html || opts.text },
        ],
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { success: false, error: `SendGrid ${res.status}: ${txt.slice(0, 200)}` };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: "Email delivery failed" };
  }
}
