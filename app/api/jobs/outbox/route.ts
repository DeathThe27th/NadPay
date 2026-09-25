import { NextResponse } from "next/server";
import { getPayrollIntegrationStatus } from "@/lib/payroll/config";
import { processOutboxBatch } from "@/lib/server/outbox-worker";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(secret && supplied && supplied === secret);
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const integrations = getPayrollIntegrationStatus();
  if (integrations.database !== "configured" || integrations.email !== "configured") {
    return NextResponse.json({ error: "outbox-not-configured", integrations }, { status: 503 });
  }
  try {
    return NextResponse.json({ status: "processed", ...(await processOutboxBatch()) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Outbox processing failed." }, { status: 502 });
  }
}
