import { NextResponse } from "next/server";
import { getPayrollIntegrationStatus } from "@/lib/payroll/config";
import { validatePayrollDraft, type PayrollDraftInput } from "@/lib/payroll/drafts";
import { getVerifiedIdentity } from "@/lib/server/identity";
import { assertOwnerAllocations } from "@/lib/server/payroll-db";
import { supabaseAdminRequest } from "@/lib/server/supabase";
import { ACTIVE_NETWORK } from "@/lib/network";

export async function POST(request: Request) {
  let input: PayrollDraftInput;
  try {
    input = (await request.json()) as PayrollDraftInput;
    const draft = validatePayrollDraft(input);
    const integrations = getPayrollIntegrationStatus();
    if (integrations.auth !== "configured") {
      return NextResponse.json({ error: "verified-auth-not-configured", message: "A verified identity provider is required before saving payroll data." }, { status: 503 });
    }
    if (integrations.database !== "configured") {
      return NextResponse.json({ error: "database-not-configured", message: "A private payroll database is required before saving this draft." }, { status: 503 });
    }
    const identity = await getVerifiedIdentity(request);
    if (!identity?.appUserId) return NextResponse.json({ error: "authentication-required" }, { status: 401 });
    const verified = await assertOwnerAllocations(
      identity.appUserId,
      draft.organizationId,
      draft.allocations.map((allocation) => ({ membershipId: allocation.membershipId, walletAddress: allocation.walletAddress })),
    );
    const runs = await supabaseAdminRequest<Array<{ id: string }>>("payroll_runs", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        organization_id: draft.organizationId,
        schedule_id: draft.scheduleId ?? null,
        period_start: draft.periodStart,
        period_end: draft.periodEnd,
        status: "draft",
        claim_window_seconds: draft.claimWindowSeconds,
        chain_id: ACTIVE_NETWORK.chain.id,
        contract_address: ACTIVE_NETWORK.nadpayAddress,
        created_by: identity.appUserId,
      }),
    });
    const run = runs[0];
    if (!run) throw new Error("Payroll draft could not be saved.");
    await supabaseAdminRequest("funded_allocations", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(
        draft.allocations.map((allocation, index) => ({
          payroll_run_id: run.id,
          membership_id: verified[index].membershipId,
          wallet_address: verified[index].walletAddress,
          token: "MON",
          amount_base_units: allocation.amountBaseUnits.toString(),
        })),
      ),
    });
    return NextResponse.json({ ok: true, payrollRunId: run.id, totalBaseUnits: draft.totalBaseUnits.toString() }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid payroll draft.";
    const status = message === "authentication-required" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
