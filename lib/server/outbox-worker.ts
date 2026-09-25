import { supabaseAdminRequest } from "./supabase";
import { retryAt, type OutboxNotification } from "@/lib/payroll/outbox";
import { sendTransactionalEmail } from "./resend";

type OutboxRow = OutboxNotification & { status: string; next_attempt_at: string };

type WorkerResult = { sent: number; failed: number; skipped: number };

export async function processOutboxBatch(limit = 25): Promise<WorkerResult> {
  const now = new Date().toISOString();
  const rows = await supabaseAdminRequest<OutboxRow[]>(
    `notification_outbox?status=in.(pending,failed)&next_attempt_at=lte.${encodeURIComponent(now)}&order=created_at.asc&limit=${Math.min(Math.max(limit, 1), 100)}`,
  );
  const result: WorkerResult = { sent: 0, failed: 0, skipped: 0 };

  for (const row of rows) {
    const claimed = await supabaseAdminRequest<OutboxRow[]>(
      `notification_outbox?id=eq.${encodeURIComponent(row.id)}&status=in.(pending,failed)`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ status: "sending", attempts: row.attempts + 1 }),
      },
    );
    if (claimed.length !== 1) {
      result.skipped += 1;
      continue;
    }

    try {
      await sendTransactionalEmail(row.payload);
      await supabaseAdminRequest(
        `notification_outbox?id=eq.${encodeURIComponent(row.id)}`,
        {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ status: "sent", sent_at: new Date().toISOString(), last_error: null }),
        },
      );
      result.sent += 1;
    } catch (error) {
      await supabaseAdminRequest(
        `notification_outbox?id=eq.${encodeURIComponent(row.id)}`,
        {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ status: "failed", next_attempt_at: retryAt(row.attempts), last_error: error instanceof Error ? error.message : "Email delivery failed." }),
        },
      );
      result.failed += 1;
    }
  }
  return result;
}
