import { getAddress, isAddress } from "viem";
import { sumBaseUnits } from "./money";

export const ALLOWED_CLAIM_WINDOWS = new Set([86400, 3 * 86400, 7 * 86400, 14 * 86400]);

export type DraftAllocationInput = {
  membershipId: string;
  walletAddress: string;
  amountBaseUnits: string;
  token?: string;
};

export type PayrollDraftInput = {
  organizationId: string;
  scheduleId?: string;
  periodStart: string;
  periodEnd: string;
  claimWindowSeconds: number;
  allocations: DraftAllocationInput[];
};

export type ValidatedPayrollDraft = Omit<PayrollDraftInput, "allocations"> & {
  allocations: Array<{
    membershipId: string;
    walletAddress: `0x${string}`;
    amountBaseUnits: bigint;
    token: "MON";
  }>;
  totalBaseUnits: bigint;
};

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

/** Validate a payroll draft before any database write or wallet prompt. */
export function validatePayrollDraft(input: PayrollDraftInput): ValidatedPayrollDraft {
  if (!input.organizationId.trim()) throw new Error("Organization is required.");
  if (input.scheduleId !== undefined && !input.scheduleId.trim()) throw new Error("Schedule id is invalid.");
  if (!isIsoDate(input.periodStart) || !isIsoDate(input.periodEnd) || input.periodEnd < input.periodStart) {
    throw new Error("Payroll period is invalid.");
  }
  if (!ALLOWED_CLAIM_WINDOWS.has(input.claimWindowSeconds)) throw new Error("Claim window is not supported.");
  if (input.allocations.length === 0 || input.allocations.length > 500) throw new Error("Payroll must contain between 1 and 500 allocations.");

  const wallets = new Set<string>();
  const allocations = input.allocations.map((allocation) => {
    if (!allocation.membershipId.trim()) throw new Error("Every allocation needs a membership id.");
    if (!isAddress(allocation.walletAddress)) throw new Error("Every allocation needs a valid payout wallet.");
    const walletAddress = getAddress(allocation.walletAddress);
    const walletKey = walletAddress.toLowerCase();
    if (wallets.has(walletKey)) throw new Error("A payout wallet can appear only once in a draft.");
    wallets.add(walletKey);
    if (allocation.token && allocation.token !== "MON") throw new Error("Initial payroll drafts support MON only.");
    if (!/^\d+$/.test(allocation.amountBaseUnits)) throw new Error("Amounts must be integer base units.");
    const amountBaseUnits = BigInt(allocation.amountBaseUnits);
    if (amountBaseUnits <= 0n) throw new Error("Amounts must be greater than zero.");
    return { membershipId: allocation.membershipId, walletAddress, amountBaseUnits, token: "MON" as const };
  });

  return { ...input, allocations, totalBaseUnits: sumBaseUnits(allocations.map((allocation) => allocation.amountBaseUnits)) };
}
