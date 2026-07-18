/**
 * Claim-as-USDC swap layer (BUILD-2-SWAP.md).
 *
 * The NadPay contract always releases native MON. This layer optionally lets a
 * claimant route the just-claimed MON through Uniswap to USDC in a second,
 * explicitly-confirmed transaction. It is entirely config-gated: when
 * SWAP_CONFIG is null the receive-as toggle never renders and the core claim
 * flow is byte-for-byte unaffected.
 *
 * Address provenance (chain 10143, checked 2026-07-18):
 * - USDC  0x534b2f3A21130d7a60830c2Df862319e593943A3
 *     source: monad-crypto/protocols testnet/Circle_USDC.json — verified
 *     on-chain (has code, symbol() == "USDC", decimals() == 6).
 * - WMON  0xFb8bf4c1CC7a94c73D209a149eA2AbEa852BC541
 *     source: docs.monad.xyz/developer-essentials/testnets — verified
 *     on-chain (has code, symbol() == "WMON").
 * - Uniswap: NOT DEPLOYED on the current testnet. Monad testnet was reset
 *     from genesis on 2025-12-16; the pre-reset Uniswap addresses in
 *     monad-crypto/protocols (V2/V3 routers + factories) all have no code on
 *     the live chain (checked via three independent RPCs), and Uniswap's
 *     official deployment docs list Monad MAINNET only. Per the build spec's
 *     locked rule we ship without the swap toggle rather than invent a pool.
 *
 * To enable: fill SWAP_CONFIG with a Uniswap-official router/quoter and a
 * cast-verified MON/USDC pool. Everything downstream lights up automatically.
 */

export const USDC_ADDRESS = "0x534b2f3A21130d7a60830c2Df862319e593943A3" as const;
export const WMON_ADDRESS = "0xFb8bf4c1CC7a94c73D209a149eA2AbEa852BC541" as const;

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
export const SWAP_CONFIG: SwapConfig | null = null;

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
