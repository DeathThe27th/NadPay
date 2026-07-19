"use client";

import { useCallback, useEffect, useState } from "react";
import { formatUnits } from "viem";
import { usePublicClient } from "wagmi";
import { formatMon, shortAddress } from "@/lib/format";
import { NADPAY_ABI, NADPAY_ADDRESS } from "@/lib/nadpay";
import {
  DEFAULT_SLIPPAGE_BPS,
  QUOTER_V2_ABI,
  QUOTE_TTL_MS,
  minReceived,
  priceImpactBps,
  rateFromQuote,
  swapDecision,
  type SwapConfig,
  type SwapDecision,
} from "@/lib/swap";

export type SwapQuote = {
  quotedOut: bigint | null;
  minOut: bigint | null;
  impactBps: number | null;
  swapGasWei: bigint | null;
  decision: SwapDecision;
  secondsLeft: number;
  slippageBps: number;
  setSlippageBps: (bps: number) => void;
  refresh: () => void;
};

/**
 * Live MON->USDC quote for an atomic claimAndSwap. Quotes come from Uniswap's
 * QuoterV2; the resulting minOut is what the claim transaction passes to the
 * contract, so the quote (and its guards) run BEFORE the user signs anything.
 */
export function useSwapQuote(
  config: SwapConfig | null,
  roundId: bigint,
  amountWei: bigint,
  account: `0x${string}` | undefined,
): SwapQuote {
  const publicClient = usePublicClient();

  const [quotedOut, setQuotedOut] = useState<bigint | null>(null);
  const [impactBps, setImpactBps] = useState<number | null>(null);
  const [swapGasWei, setSwapGasWei] = useState<bigint | null>(null);
  const [quotedAtMs, setQuotedAtMs] = useState<number | null>(null);
  const [slippageBps, setSlippageBps] = useState(DEFAULT_SLIPPAGE_BPS);
  const [, forceTick] = useState(0);

  const refresh = useCallback(async () => {
    if (!publicClient || !config || amountWei === 0n) return;
    try {
      const quoteFor = async (amountIn: bigint) => {
        const { result } = await publicClient.simulateContract({
          address: config.quoter,
          abi: QUOTER_V2_ABI,
          functionName: "quoteExactInputSingle",
          args: [
            {
              tokenIn: config.wmon,
              tokenOut: config.usdc,
              amountIn,
              fee: config.poolFee,
              sqrtPriceLimitX96: 0n,
            },
          ],
        });
        return result[0];
      };
      const probe = 10n ** 15n; // 0.001 MON marginal-price probe
      const [actualOut, probeOut] = await Promise.all([
        quoteFor(amountWei),
        quoteFor(probe),
      ]);
      setQuotedOut(actualOut);
      setImpactBps(
        priceImpactBps(
          rateFromQuote(probe, probeOut),
          rateFromQuote(amountWei, actualOut),
        ),
      );
      try {
        // The swap runs inside the claim, so estimate the real transaction.
        const gas = await publicClient.estimateContractGas({
          address: NADPAY_ADDRESS,
          abi: NADPAY_ABI,
          functionName: "claimAndSwap",
          args: [roundId, 1n],
          account,
        });
        const gasPrice = await publicClient.getGasPrice();
        setSwapGasWei(gas * gasPrice);
      } catch {
        setSwapGasWei(null);
      }
      setQuotedAtMs(Date.now());
    } catch {
      setQuotedOut(null);
      setImpactBps(null);
      setQuotedAtMs(Date.now());
    }
  }, [publicClient, config, roundId, amountWei, account]);

  useEffect(() => {
    refresh();
    const interval = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  const decision = swapDecision({
    config,
    quotedOut,
    impactBps,
    quotedAtMs,
    nowMs: Date.now(),
    swapGasWei,
    amountInWei: amountWei,
  });

  return {
    quotedOut,
    minOut: quotedOut ? minReceived(quotedOut, slippageBps) : null,
    impactBps,
    swapGasWei,
    decision,
    secondsLeft: quotedAtMs
      ? Math.max(0, Math.ceil((quotedAtMs + QUOTE_TTL_MS - Date.now()) / 1000))
      : 0,
    slippageBps,
    setSlippageBps,
    refresh,
  };
}

/** Quote breakdown shown above the claim button when USDC is selected. */
export function SwapQuotePanel({
  quote,
  config,
  amountWei,
}: {
  quote: SwapQuote;
  config: SwapConfig;
  amountWei: bigint;
}) {
  const { decision } = quote;

  if (decision.status === "hidden") return null;

  if (decision.status === "disabled") {
    return (
      <p className="rounded-xl border border-border bg-background px-3 py-2.5 text-left text-sm text-muted">
        {decision.reason === "no-quote"
          ? "No usable MON→USDC quote right now — claim as MON instead."
          : "Price impact is too high for this size — claiming as MON is the better deal."}
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-background p-3 text-left">
      <dl className="space-y-1.5 text-sm">
        <Row label="You claim" value={`${formatMon(amountWei)} MON`} />
        <Row
          label="Estimated out"
          value={
            quote.quotedOut ? `${formatUnits(quote.quotedOut, 6)} USDC` : "—"
          }
        />
        <Row
          label="Price impact"
          value={
            quote.impactBps !== null
              ? `${(quote.impactBps / 100).toFixed(2)}%`
              : "—"
          }
        />
        <Row
          label="Min received"
          value={quote.minOut ? `${formatUnits(quote.minOut, 6)} USDC` : "—"}
        />
        <Row
          label="Gas (est.)"
          value={quote.swapGasWei ? `${formatMon(quote.swapGasWei)} MON` : "—"}
        />
        <Row label="Router" value={shortAddress(config.router)} mono />
        <Row
          label="Quote expires"
          value={decision.status === "stale" ? "expired" : `${quote.secondsLeft}s`}
        />
      </dl>

      <div className="flex items-center justify-between gap-3">
        <label htmlFor="slippage" className="text-sm text-muted">
          Slippage
        </label>
        <select
          id="slippage"
          value={quote.slippageBps}
          onChange={(e) => quote.setSlippageBps(Number(e.target.value))}
          className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none"
        >
          <option value={50}>0.5%</option>
          <option value={100}>1%</option>
          <option value={200}>2%</option>
        </select>
      </div>

      {decision.status === "ok" && decision.warning && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          Heads up: gas is a large share of this amount — taking MON may be the
          better deal.
        </p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={mono ? "font-mono tabular" : "tabular"}>{value}</dd>
    </div>
  );
}
