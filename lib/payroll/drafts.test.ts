import { describe, expect, it } from "vitest";
import { validatePayrollDraft } from "./drafts";

const wallet = "0x70997970c51812dc3a010c7d01b50e0d17dc79c8";
const base = {
  organizationId: "org-1",
  periodStart: "2026-09-01",
  periodEnd: "2026-09-30",
  claimWindowSeconds: 7 * 86400,
  allocations: [{ membershipId: "member-1", walletAddress: wallet, amountBaseUnits: "1000000000000000000" }],
};

describe("payroll draft validation", () => {
  it("normalizes valid wallet and sums base units", () => {
    const result = validatePayrollDraft(base);
    expect(result.allocations[0].walletAddress.toLowerCase()).toBe(wallet);
    expect(result.totalBaseUnits).toBe(1_000_000_000_000_000_000n);
  });

  it("rejects duplicate wallets and decimal amounts", () => {
    expect(() => validatePayrollDraft({ ...base, allocations: [...base.allocations, { membershipId: "member-2", walletAddress: wallet, amountBaseUnits: "2" }] })).toThrow(/once/);
    expect(() => validatePayrollDraft({ ...base, allocations: [{ ...base.allocations[0], amountBaseUnits: "1.5" }] })).toThrow(/integer/);
  });

  it("keeps initial drafts MON-only", () => {
    expect(() => validatePayrollDraft({ ...base, allocations: [{ ...base.allocations[0], token: "USDC" }] })).toThrow(/MON only/);
  });
});
