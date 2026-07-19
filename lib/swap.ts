/**
 * Claim-as-USDC swap layer (BUILD-2-SWAP.md).
 *
 * The NadPay contract always releases native MON. This layer optionally lets a
 * claimant route the just-claimed MON through Uniswap to USDC in a second,
 * explicitly-confirmed transaction. It is entirely config-gated: when
 * SWAP_CONFIG is null the receive-as toggle never renders and the core claim
 * flow is byte-for-byte unaffected.
 *
 * Per-network addresses (with provenance) live in lib/network.ts. On mainnet
 * a verified WMON/USDC 0.3% pool exists so the config is live; testnet has no
 * post-reset Uniswap deployment, so its config stays null and the toggle
 * stays hidden there.
 */

import { ACTIVE_NETWORK } from "./network";

export type SwapConfig = {
  /** Uniswap SwapRouter02-compatible router, resolved from official docs. */
  router: `0x${string}`;
  /** QuoterV2-compatible quoter for exact-input quotes. */
  quoter: `0x${string}`;
  /** Fee tier of the verified WMON/USDC pool (e.g. 500, 3000). */
  poolFee: number;
  wmon: `0x${string}`;
  usdc: `0x${string}`;
};

/** null = no verified Uniswap MON<->USDC pool on this network; toggle hidden. */
export const SWAP_CONFIG: SwapConfig | null = ACTIVE_NETWORK.swap;

export const DEFAULT_SLIPPAGE_BPS = 100; // 1%
export const MAX_PRICE_IMPACT_BPS = 500; // 5% — beyond this the USDC option is blocked
export const QUOTE_TTL_MS = 30_000;

/** Minimum acceptable output after slippage, floor-rounded. */
export function minReceived(quotedOut: bigint, slippageBps: number): bigint {
  if (slippageBps < 0 || slippageBps > 10_000) throw new Error("bad slippage");
  return (quotedOut * BigInt(10_000 - slippageBps)) / 10_000n;
}

/**
 * Price impact in basis points, derived from a marginal (tiny-amount) quote
 * versus the actual-size quote. spotRate/actualRate are USDC-out per MON-in
 * scaled by 1e18; equal rates => 0 impact.
 */
export function priceImpactBps(spotRate: bigint, actualRate: bigint): number {
  if (spotRate <= 0n) return 10_000;
  if (actualRate >= spotRate) return 0;
  return Number(((spotRate - actualRate) * 10_000n) / spotRate);
}

export function rateFromQuote(amountIn: bigint, amountOut: bigint): bigint {
  if (amountIn === 0n) return 0n;
  return (amountOut * 10n ** 18n) / amountIn;
}

export type SwapDecision =
  | { status: "hidden"; reason: "no-pool-config" }
  | { status: "disabled"; reason: "no-quote" | "excessive-impact" }
  | { status: "stale"; reason: "quote-expired" }
  | { status: "ok"; warning?: "gas-exceeds-benefit" };

/**
 * The single gatekeeper for the USDC option. Pure so every branch is unit
 * tested; the UI renders exactly what this returns and nothing else.
 */
export function swapDecision(input: {
  config: SwapConfig | null;
  quotedOut: bigint | null;
  impactBps: number | null;
  quotedAtMs: number | null;
  nowMs: number;
  /** Estimated total gas cost of the swap tx, in MON wei. */
  swapGasWei: bigint | null;
  /** Amount being swapped, in MON wei. */
  amountInWei: bigint;
}): SwapDecision {
  if (!input.config) return { status: "hidden", reason: "no-pool-config" };
  if (input.quotedOut === null || input.quotedOut === 0n)
    return { status: "disabled", reason: "no-quote" };
  if (input.impactBps === null || input.impactBps > MAX_PRICE_IMPACT_BPS)
    return { status: "disabled", reason: "excessive-impact" };
  if (
    input.quotedAtMs === null ||
    input.nowMs - input.quotedAtMs > QUOTE_TTL_MS
  )
    return { status: "stale", reason: "quote-expired" };
  // Warn when the value lost to impact + gas outweighs any benefit of holding
  // USDC over MON: gas alone eating >10% of the swapped amount is a bad trade.
  if (
    input.swapGasWei !== null &&
    input.amountInWei > 0n &&
    input.swapGasWei * 10n > input.amountInWei
  )
    return { status: "ok", warning: "gas-exceeds-benefit" };
  return { status: "ok" };
}

/** SwapRouter02 exactInputSingle — the only call the swap layer ever makes. */
export const SWAP_ROUTER_ABI = [
  {
    type: "function",
    name: "exactInputSingle",
    stateMutability: "payable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "recipient", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [{ name: "amountOut", type: "uint256" }],
  },
] as const;

export const QUOTER_V2_ABI = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "fee", type: "uint24" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "sqrtPriceX96After", type: "uint160" },
      { name: "initializedTicksCrossed", type: "uint32" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;
