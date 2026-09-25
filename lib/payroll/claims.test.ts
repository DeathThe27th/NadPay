import { describe, expect, it } from "vitest";
import { reconcileClaimEvents } from "./claims";

const common = {
  chainId: 143,
  contractAddress: "0xContract",
  txHash: "0xTx",
  roundId: 7n,
  wallet: "0xWallet",
  monAmount: 2n,
  blockNumber: 50n,
};

describe("claim event reconciliation", () => {
  it("does not double-count the two events emitted by an atomic USDC claim", () => {
    const payments = reconcileClaimEvents([
      { ...common, logIndex: 1, kind: "Claimed" },
      { ...common, logIndex: 2, kind: "ClaimedAsUsdc", usdcAmount: 42n },
    ]);
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({ receivedToken: "USDC", receivedAmount: 42n });
  });

  it("keeps chain, contract, round and wallet in the payment identity", () => {
    const payments = reconcileClaimEvents([
      { ...common, logIndex: 1, kind: "Claimed" },
      { ...common, logIndex: 1, roundId: 8n, kind: "Claimed" },
    ]);
    expect(payments).toHaveLength(2);
  });
});
