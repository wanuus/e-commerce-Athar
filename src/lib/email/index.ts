export type Email = { to: string; subject: string; html: string };

/** Resend over plain HTTPS. Without keys: logs in development, warns in production (never crashes an order). */
export async function sendEmail({ to, subject, html }: Email): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n[dev email] to: ${to}\n[dev email] subject: ${subject}\n[dev email] ${html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 300)}\n`);
    } else {
      console.warn("Email not configured (RESEND_API_KEY / EMAIL_FROM): skipping send.");
    }
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) throw new Error(`email_${res.status}`);
}
