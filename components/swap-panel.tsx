"use client";

import { useCallback, useEffect, useState } from "react";
import { formatUnits } from "viem";
import { usePublicClient, useWriteContract } from "wagmi";
import { activeChain } from "@/lib/wagmi";
import { formatMon, shortAddress } from "@/lib/format";
import {
  DEFAULT_SLIPPAGE_BPS,
  QUOTER_V2_ABI,
  QUOTE_TTL_MS,
  SWAP_ROUTER_ABI,
  minReceived,
  priceImpactBps,
  rateFromQuote,
  swapDecision,
  type SwapConfig,
} from "@/lib/swap";

type SwapStatus = "idle" | "submitted" | "confirmed" | "received" | "failed";

/**
 * Post-claim MON -> USDC swap. Renders only when a verified pool config
 * exists; the claimed MON is already in the user's wallet, this is a second,
 * explicitly-confirmed transaction with the user as sole recipient.
 */
export function SwapPanel({
  config,
  amountWei,
  recipient,
}: {
  config: SwapConfig;
  amountWei: bigint;
  recipient: `0x${string}`;
}) {
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [quotedOut, setQuotedOut] = useState<bigint | null>(null);
  const [impactBps, setImpactBps] = useState<number | null>(null);
  const [swapGasWei, setSwapGasWei] = useState<bigint | null>(null);
  const [quotedAtMs, setQuotedAtMs] = useState<number | null>(null);
  const [slippageBps, setSlippageBps] = useState(DEFAULT_SLIPPAGE_BPS);
  const [status, setStatus] = useState<SwapStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [, forceTick] = useState(0);

  const fetchQuote = useCallback(async () => {
    if (!publicClient) return;
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
        const gas = await publicClient.estimateContractGas({
          address: config.router,
          abi: SWAP_ROUTER_ABI,
          functionName: "exactInputSingle",
          args: [
            {
              tokenIn: config.wmon,
              tokenOut: config.usdc,
              fee: config.poolFee,
              recipient,
              amountIn: amountWei,
              amountOutMinimum: minReceived(actualOut, slippageBps),
              sqrtPriceLimitX96: 0n,
            },
          ],
          value: amountWei,
          account: recipient,
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
  }, [publicClient, config, amountWei, recipient, slippageBps]);

  useEffect(() => {
    fetchQuote();
    const interval = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [fetchQuote]);

  const decision = swapDecision({
    config,
    quotedOut,
    impactBps,
    quotedAtMs,
    nowMs: Date.now(),
    swapGasWei,
    amountInWei: amountWei,
  });

  if (decision.status === "hidden") return null;

  async function doSwap() {
    if (!quotedOut) return;
    setStatus("submitted");
    setError(null);
    try {
      const args = [
        {
          tokenIn: config.wmon,
          tokenOut: config.usdc,
          fee: config.poolFee,
          recipient,
          amountIn: amountWei,
          amountOutMinimum: minReceived(quotedOut, slippageBps),
          sqrtPriceLimitX96: 0n,
        },
      ] as const;
      // Simulate first — reverts (slippage, drained pool) surface here
      // instead of costing the user a failed transaction.
      await publicClient!.simulateContract({
        address: config.router,
        abi: SWAP_ROUTER_ABI,
        functionName: "exactInputSingle",
        args,
        value: amountWei,
        account: recipient,
      });
      const hash = await writeContractAsync({
        address: config.router,
        abi: SWAP_ROUTER_ABI,
        functionName: "exactInputSingle",
        args,
        value: amountWei,
        chainId: activeChain.id,
      });
      setStatus("confirmed");
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      setStatus(receipt.status === "success" ? "received" : "failed");
    } catch (e) {
      setStatus("failed");
      setError(e instanceof Error ? e.message.split("\n")[0] : "Swap failed");
    }
  }

  if (status === "received") {
    return (
      <div className="rounded-2xl border border-success/40 bg-success-soft p-5 text-center">
        <p className="font-semibold">Swapped to USDC ✓</p>
        <p className="mt-1 text-sm text-muted">
          {quotedOut ? `~${formatUnits(quotedOut, 6)} USDC` : "USDC"} delivered
          to your wallet. Finalized on Monad.
        </p>
      </div>
    );
  }

  const secondsLeft = quotedAtMs
    ? Math.max(0, Math.ceil((quotedAtMs + QUOTE_TTL_MS - Date.now()) / 1000))
    : 0;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Swap to USDC</p>
        <span className="text-xs text-muted">via Uniswap on Monad</span>
      </div>

      {decision.status === "disabled" ? (
        <p className="text-sm text-muted">
          {decision.reason === "no-quote"
            ? "No usable MON→USDC quote right now — claim as MON instead."
            : "Price impact is too high for this size — claiming as MON is the better deal."}
        </p>
      ) : (
        <>
          <dl className="space-y-1.5 text-sm">
            <Row label="You swap" value={`${formatMon(amountWei)} MON`} />
            <Row
              label="Estimated out"
              value={quotedOut ? `${formatUnits(quotedOut, 6)} USDC` : "—"}
            />
            <Row
              label="Price impact"
              value={impactBps !== null ? `${(impactBps / 100).toFixed(2)}%` : "—"}
            />
            <Row
              label="Min received"
              value={
                quotedOut
                  ? `${formatUnits(minReceived(quotedOut, slippageBps), 6)} USDC`
                  : "—"
              }
            />
            <Row
              label="Swap gas (est.)"
              value={swapGasWei ? `${formatMon(swapGasWei)} MON` : "—"}
            />
            <Row label="Router" value={shortAddress(config.router)} mono />
            <Row label="Recipient" value={shortAddress(recipient)} mono />
            <Row
              label="Quote expires"
              value={decision.status === "stale" ? "expired" : `${secondsLeft}s`}
            />
          </dl>

          <div className="flex items-center justify-between gap-3">
            <label htmlFor="slippage" className="text-sm text-muted">
              Slippage
            </label>
            <select
              id="slippage"
              value={slippageBps}
              onChange={(e) => setSlippageBps(Number(e.target.value))}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none"
            >
              <option value={50}>0.5%</option>
              <option value={100}>1%</option>
              <option value={200}>2%</option>
            </select>
          </div>

          {decision.status === "ok" && decision.warning && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              Heads up: swap gas is a large share of this amount — taking MON
              may be the better deal.
            </p>
          )}

          {decision.status === "stale" ? (
            <button
              onClick={fetchQuote}
              className="w-full rounded-xl border border-border bg-background py-2.5 text-sm font-semibold hover:border-primary hover:text-primary transition-colors"
            >
              Quote expired — refresh
            </button>
          ) : (
            <button
              onClick={doSwap}
              disabled={status === "submitted" || status === "confirmed"}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-strong transition-colors disabled:opacity-60"
            >
              {status === "submitted"
                ? "Submitting swap…"
                : status === "confirmed"
                  ? "Confirming…"
                  : "Confirm swap"}
            </button>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <p className="text-xs text-muted">
            Two transactions total: your MON claim (done) and this swap. The
            swap sends USDC only to your own connected wallet.
          </p>
        </>
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
