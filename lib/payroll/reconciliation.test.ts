import { describe, expect, it } from "vitest";
import { payrollSubmissionKey, reconcileFunding } from "./reconciliation";

const expected = {
  chainId: 143,
  contractAddress: "0xAbc",
  payer: "0xPayer",
  totalFunded: 10n,
};

const receipt = {
  status: "success" as const,
  chainId: 143,
  contractAddress: "0xabc",
  payer: "0xpayer",
  roundId: 7n,
  totalFunded: 10n,
  allocationTotal: 10n,
  txHash: "0xtransaction",
  blockNumber: 100n,
};

describe("funding reconciliation", () => {
  it("accepts only a matching successful receipt", () => {
    expect(reconcileFunding(receipt, expected)).toEqual({
      ok: true,
      identity: "143:0xabc:7",
    });
  });

  it("rejects receipt mismatches before notifications", () => {
    expect(reconcileFunding({ ...receipt, status: "reverted" }, expected)).toEqual({ ok: false, reason: "receipt-reverted" });
    expect(reconcileFunding({ ...receipt, chainId: 10143 }, expected)).toEqual({ ok: false, reason: "wrong-chain" });
    expect(reconcileFunding({ ...receipt, allocationTotal: 9n }, expected)).toEqual({ ok: false, reason: "allocation-total-mismatch" });
  });

  it("provides a stable retry key", () => {
    expect(payrollSubmissionKey("org-1", "run-2")).toBe("org-1:run-2");
  });
});
