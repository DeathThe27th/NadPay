import { describe, expect, it } from "vitest";
import {
  MAX_PRICE_IMPACT_BPS,
  QUOTE_TTL_MS,
  SWAP_CONFIG,
  minReceived,
  priceImpactBps,
  rateFromQuote,
  swapDecision,
  type SwapConfig,
} from "./swap";

const cfg: SwapConfig = {
  router: "0x0000000000000000000000000000000000000001",
  quoter: "0x0000000000000000000000000000000000000002",
  poolFee: 500,
  wmon: "0x0000000000000000000000000000000000000003",
  usdc: "0x0000000000000000000000000000000000000004",
};

const NOW = 1_000_000;
const base = {
  config: cfg,
  quotedOut: 1_000_000n, // 1 USDC
  impactBps: 30,
  quotedAtMs: NOW,
  nowMs: NOW,
  swapGasWei: 10n ** 15n, // 0.001 MON
  amountInWei: 10n ** 18n, // 1 MON
};

describe("swapDecision", () => {
  it("hides the USDC option when no verified pool config exists", () => {
    expect(swapDecision({ ...base, config: null })).toEqual({
      status: "hidden",
      reason: "no-pool-config",
    });
  });

  it("ships live on mainnet: SWAP_CONFIG carries the verified 0.3% WMON/USDC pool", () => {
    expect(SWAP_CONFIG).not.toBeNull();
    expect(SWAP_CONFIG?.poolFee).toBe(3000);
    expect(swapDecision({ ...base, config: SWAP_CONFIG }).status).toBe("ok");
  });

  it("disables when no quote / empty pool", () => {
    expect(swapDecision({ ...base, quotedOut: null })).toEqual({
      status: "disabled",
      reason: "no-quote",
    });
    expect(swapDecision({ ...base, quotedOut: 0n })).toEqual({
      status: "disabled",
      reason: "no-quote",
    });
  });

  it("blocks excessive price impact", () => {
    expect(
      swapDecision({ ...base, impactBps: MAX_PRICE_IMPACT_BPS + 1 }),
    ).toEqual({ status: "disabled", reason: "excessive-impact" });
    expect(
      swapDecision({ ...base, impactBps: MAX_PRICE_IMPACT_BPS }).status,
    ).toBe("ok");
  });

  it("marks expired quotes stale, requiring refresh before execution", () => {
    expect(
      swapDecision({ ...base, nowMs: NOW + QUOTE_TTL_MS + 1 }),
    ).toEqual({ status: "stale", reason: "quote-expired" });
    expect(
      swapDecision({ ...base, nowMs: NOW + QUOTE_TTL_MS }).status,
    ).toBe("ok");
  });

  it("warns when gas exceeds the benefit of swapping", () => {
    // gas 0.02 MON on a 0.1 MON swap = 20% > 10% threshold
    expect(
      swapDecision({
        ...base,
        swapGasWei: 2n * 10n ** 16n,
        amountInWei: 10n ** 17n,
      }),
    ).toEqual({ status: "ok", warning: "gas-exceeds-benefit" });
  });

  it("allows a healthy swap with no warning", () => {
    expect(swapDecision(base)).toEqual({ status: "ok" });
  });
});

describe("minReceived (slippage guard)", () => {
  it("applies basis-point slippage, floor-rounded", () => {
    expect(minReceived(1_000_000n, 100)).toBe(990_000n); // 1%
    expect(minReceived(1_000_000n, 50)).toBe(995_000n); // 0.5%
    expect(minReceived(999n, 100)).toBe(989n);
  });

  it("rejects nonsense slippage", () => {
    expect(() => minReceived(1n, -1)).toThrow();
    expect(() => minReceived(1n, 10_001)).toThrow();
  });
});

describe("priceImpactBps", () => {
  it("computes impact from marginal vs actual rate", () => {
    const spot = rateFromQuote(10n ** 15n, 1_000n); // 1000 out per 0.001 in
    const actual = rateFromQuote(10n ** 18n, 950_000n); // 5% worse at size
    expect(priceImpactBps(spot, actual)).toBe(500);
  });

  it("clamps to zero when actual is at or better than spot", () => {
    expect(priceImpactBps(100n, 100n)).toBe(0);
    expect(priceImpactBps(100n, 120n)).toBe(0);
  });

  it("treats a zero spot rate as maximally impacted (empty pool)", () => {
    expect(priceImpactBps(0n, 100n)).toBe(10_000);
  });
});
