export type IndexedClaimEvent = {
  chainId: number;
  contractAddress: string;
  txHash: string;
  logIndex: number;
  roundId: bigint;
  wallet: string;
  kind: "Claimed" | "ClaimedAsUsdc";
  monAmount: bigint;
  usdcAmount?: bigint;
  blockNumber: bigint;
};

export type ReconciledPayment = {
  identity: string;
  roundId: bigint;
  wallet: string;
  monAmount: bigint;
  receivedToken: "MON" | "USDC";
  receivedAmount: bigint;
  txHash: string;
  blockNumber: bigint;
};

/** Treat Claimed + ClaimedAsUsdc from one swap as one payment. */
export function reconcileClaimEvents(events: readonly IndexedClaimEvent[]): ReconciledPayment[] {
  const byPayment = new Map<string, ReconciledPayment>();
  for (const event of events) {
    const identity = `${event.chainId}:${event.contractAddress.toLowerCase()}:${event.roundId.toString()}:${event.wallet.toLowerCase()}`;
    const existing = byPayment.get(identity);
    if (existing && existing.txHash === event.txHash) {
      if (event.kind === "ClaimedAsUsdc") {
        existing.receivedToken = "USDC";
        existing.receivedAmount = event.usdcAmount ?? 0n;
      }
      continue;
    }
    if (existing) continue;
    byPayment.set(identity, {
      identity,
      roundId: event.roundId,
      wallet: event.wallet,
      monAmount: event.monAmount,
      receivedToken: event.kind === "ClaimedAsUsdc" ? "USDC" : "MON",
      receivedAmount: event.kind === "ClaimedAsUsdc" ? event.usdcAmount ?? 0n : event.monAmount,
      txHash: event.txHash,
      blockNumber: event.blockNumber,
    });
  }
  return [...byPayment.values()];
}
