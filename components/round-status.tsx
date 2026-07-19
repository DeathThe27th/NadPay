"use client";

import { useState } from "react";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { NADPAY_ABI, NADPAY_ADDRESS } from "@/lib/nadpay";
import { monadTestnet } from "@/lib/wagmi";
import { formatMon, shortAddress } from "@/lib/format";

const POLL_MS = 15_000;

/**
 * Reclaim with an inline two-step confirm — no modal, works in tight rows.
 * Rendered only for the round's payer once the deadline has passed with
 * funds left unclaimed.
 */
export function ReclaimButton({
  roundId,
  leftover,
  onDone,
}: {
  roundId: bigint;
  leftover: bigint;
  onDone?: () => void;
}) {
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function doReclaim() {
    setBusy(true);
    setError(null);
    try {
      const hash = await writeContractAsync({
        address: NADPAY_ADDRESS,
        abi: NADPAY_ABI,
        functionName: "reclaim",
        args: [roundId],
        chainId: monadTestnet.id,
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      setArmed(false);
      onDone?.();
    } catch (e) {
      setError(
        e instanceof Error ? e.message.split("\n")[0] : "Reclaim failed",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!armed) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setArmed(true);
          }}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-strong transition-colors"
        >
          Reclaim {formatMon(leftover)} MON
        </button>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={doReclaim}
        disabled={busy}
        className="rounded-xl bg-danger px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {busy ? "Reclaiming…" : `Confirm reclaim`}
      </button>
      <button
        onClick={() => setArmed(false)}
        disabled={busy}
        className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted hover:text-foreground transition-colors disabled:opacity-60"
      >
        Cancel
      </button>
    </div>
  );
}

/**
 * Per-recipient claim status for one round: progress bar, recipient list,
 * and the payer-only reclaim panel. Self-fetching (with light polling) so it
 * drops into the round page, the post-create screen, and history rows alike.
 */
export function RoundStatus({
  roundId,
  onChanged,
}: {
  roundId: bigint;
  onChanged?: () => void;
}) {
  const { address } = useAccount();

  const { data: round, refetch: refetchRound } = useReadContract({
    address: NADPAY_ADDRESS,
    abi: NADPAY_ABI,
    functionName: "getRound",
    args: [roundId],
    query: { refetchInterval: POLL_MS },
  });

  const { data: breakdown, refetch: refetchBreakdown } = useReadContract({
    address: NADPAY_ADDRESS,
    abi: NADPAY_ABI,
    functionName: "getRoundRecipients",
    args: [roundId],
    query: { refetchInterval: POLL_MS },
  });

  if (!round) {
    return (
      <div className="space-y-2" aria-hidden>
        <div className="h-2 animate-pulse rounded-full bg-surface" />
        <div className="h-12 animate-pulse rounded-xl bg-surface" />
        <div className="h-12 animate-pulse rounded-xl bg-surface" />
      </div>
    );
  }

  const [payer, totalFunded, totalClaimed, deadline, closed] = round;
  if (payer === "0x0000000000000000000000000000000000000000") {
    return (
      <p className="text-sm text-muted">
        Payout #{roundId.toString()} doesn&apos;t exist.
      </p>
    );
  }

  const isPayer = address?.toLowerCase() === payer.toLowerCase();
  const past = BigInt(Math.floor(Date.now() / 1000)) > deadline;
  const leftover = totalFunded - totalClaimed;
  const progress =
    totalFunded > 0n ? Number((totalClaimed * 100n) / totalFunded) : 0;
  const recipients = breakdown?.[0] ?? [];
  const amounts = breakdown?.[1] ?? [];
  const claimedFlags = breakdown?.[2] ?? [];
  const claimedCount = claimedFlags.filter(Boolean).length;

  async function refresh() {
    await Promise.all([refetchRound(), refetchBreakdown()]);
    onChanged?.();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted">
          <span>
            {claimedCount} of {recipients.length} claimed ·{" "}
            {formatMon(totalClaimed)} / {formatMon(totalFunded)} MON
          </span>
          <span className="tabular">{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface border border-border">
          <div
            className="fill-bar h-full rounded-full bg-success"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {recipients.map((recipient, i) => (
          <li
            key={recipient + i}
            className="flex items-center justify-between gap-3 bg-background px-4 py-3"
          >
            <span className="min-w-0 truncate font-mono text-sm">
              {shortAddress(recipient)}
            </span>
            <span className="flex items-center gap-3">
              <span className="font-mono text-sm tabular">
                {formatMon(amounts[i] ?? 0n)} MON
              </span>
              {claimedFlags[i] ? (
                <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success">
                  claimed
                </span>
              ) : (
                <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-muted">
                  waiting
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      {isPayer && !closed && (
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">{formatMon(leftover)} MON unclaimed</p>
              <p className="text-sm text-muted">
                {past
                  ? "The claim window has ended — you can take the leftovers back."
                  : "Reclaim unlocks when the claim window ends."}
              </p>
            </div>
            {past && leftover > 0n ? (
              <ReclaimButton
                roundId={roundId}
                leftover={leftover}
                onDone={refresh}
              />
            ) : (
              <button
                disabled
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white opacity-50"
              >
                Reclaim leftovers
              </button>
            )}
          </div>
        </div>
      )}
      {closed && (
        <p className="text-sm text-muted">
          This payout is closed — leftovers were returned to the sender.
        </p>
      )}
    </div>
  );
}
