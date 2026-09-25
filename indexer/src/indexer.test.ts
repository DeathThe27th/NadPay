import { describe, it } from "vitest";
import { createTestIndexer } from "generated";
import { TestHelpers } from "envio";

describe("NadPay contract Claimed event tests", () => {
  it("NadPay_Claimed is created correctly", async (t) => {
    const indexer = createTestIndexer();

    // Creating mock for NadPay contract Claimed event
    const event = {
      contract: "NadPay" as const,
      event: "Claimed" as const,
      params: {
        roundId: 0n,
        recipient: TestHelpers.Addresses.defaultAddress,
        amount: 0n,
      },
    };

    await indexer.process({
      chains: {
        143: {
          simulate: [event],
        },
      },
    });

    const actual = await indexer.NadPay_Claimed.getWhere({ roundId: { _eq: event.params.roundId } });
    t.expect(actual).toHaveLength(1);
    t.expect(actual[0]).toMatchObject({
      roundId: event.params.roundId,
      recipient: event.params.recipient,
      amount: event.params.amount,
    });
    t.expect(actual[0]?.transactionHash).toMatch(/^0x/);
    t.expect(actual[0]?.blockNumber).toBeGreaterThanOrEqual(0n);
  });
});

describe("Indexer smoke test", () => {
  it("processes the first block with events on chain 143", async (t) => {
    const indexer = createTestIndexer();

    const result = await indexer.process({ chains: { 143: {} } });

    t.expect(result.changes.length, "Should have at least one change").toBeGreaterThan(0);
    t.expect(result.changes[0].chainId).toBe(143);
    t.expect(result.changes[0].eventsProcessed).toBeGreaterThan(0);
  }, 60_000);
});
