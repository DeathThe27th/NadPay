export type OutboxNotification = {
  id: string;
  kind: string;
  dedupeKey: string;
  payload: { to: string; subject: string; text: string; html?: string };
  attempts: number;
};

export function retryAt(attempts: number, now = new Date()): string {
  const bounded = Math.min(Math.max(attempts, 0), 12);
  const delayMs = Math.min(24 * 60 * 60 * 1000, 30_000 * 2 ** bounded);
  return new Date(now.getTime() + delayMs).toISOString();
}

export function paymentReadyNotificationKey(payrollRunId: string, userId: string): string {
  return `payment-ready:${payrollRunId}:${userId}`;
}
