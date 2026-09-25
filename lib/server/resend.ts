export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}, env: NodeJS.ProcessEnv = process.env): Promise<void> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) throw new Error("Email provider configuration is missing.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, ...input }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Email provider failed with ${response.status}.`);
}
