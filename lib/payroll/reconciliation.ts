export type FundingReceipt = {
  status: "success" | "reverted";
  chainId: number;
  contractAddress: string;
  payer: string;
  roundId: bigint;
  totalFunded: bigint;
  allocationTotal: bigint;
  txHash: string;
  blockNumber: bigint;
};

export type FundingExpectation = {
  chainId: number;
  contractAddress: string;
  payer: string;
  totalFunded: bigint;
};

export type ReconciliationResult =
  | { ok: true; identity: string }
  | { ok: false; reason: string };

/** Validate the chain facts before a payroll run can become funded. */
export function reconcileFunding(
  receipt: FundingReceipt,
  expected: FundingExpectation,
): ReconciliationResult {
  if (receipt.status !== "success") return { ok: false, reason: "receipt-reverted" };
  if (receipt.chainId !== expected.chainId) return { ok: false, reason: "wrong-chain" };
  if (receipt.contractAddress.toLowerCase() !== expected.contractAddress.toLowerCase()) {
    return { ok: false, reason: "wrong-contract" };
  }
  if (receipt.payer.toLowerCase() !== expected.payer.toLowerCase()) {
    return { ok: false, reason: "wrong-payer" };
  }
  if (receipt.totalFunded !== expected.totalFunded) {
    return { ok: false, reason: "wrong-funded-total" };
  }
  if (receipt.allocationTotal !== expected.totalFunded) {
    return { ok: false, reason: "allocation-total-mismatch" };
  }
  if (!receipt.txHash || receipt.blockNumber < 0n) {
    return { ok: false, reason: "missing-receipt-reference" };
  }
  return {
    ok: true,
    identity: `${receipt.chainId}:${receipt.contractAddress.toLowerCase()}:${receipt.roundId.toString()}`,
  };
}

export function payrollSubmissionKey(organizationId: string, payrollRunId: string): string {
  return `${organizationId}:${payrollRunId}`;
}
