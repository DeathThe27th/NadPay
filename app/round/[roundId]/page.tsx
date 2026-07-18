"use client";

import { use, useState } from "react";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { NADPAY_ABI, NADPAY_ADDRESS } from "@/lib/nadpay";
import { monadTestnet } from "@/lib/wagmi";
import { deadlineLabel, formatMon, shortAddress } from "@/lib/format";
import { ConnectGate, Shell } from "@/components/shell";

export default function RoundPage({
  params,
}: {
  params: Promise<{ roundId: string }>;
}) {
  const { roundId: roundIdParam } = use(params);
  const roundId = BigInt(roundIdParam);
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: round, refetch: refetchRound } = useReadContract({
    address: NADPAY_ADDRESS,
    abi: NADPAY_ABI,
    functionName: "getRound",
    args: [roundId],
  });

  const { data: breakdown, refetch: refetchBreakdown } = useReadContract({
    address: NADPAY_ADDRESS,
    abi: NADPAY_ABI,
    functionName: "getRoundRecipients",
    args: [roundId],
  });

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
      await Promise.all([refetchRound(), refetchBreakdown()]);
    } catch (e) {
      setError(e instanceof Error ? e.message.split("\n")[0] : "Reclaim failed");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(
      `${window.location.origin}/claim/${roundId}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  if (!isConnected) {
    return (
      <Shell>
        <ConnectGate headline="Track a payout." />
      </Shell>
    );
  }

  if (!round) {
    return (
      <Shell>
        <div className="flex flex-1 items-center justify-center text-muted">
          Loading payout…
        </div>
      </Shell>
    );
  }

  const [payer, totalFunded, totalClaimed, deadline, closed] = round;
  const exists = payer !== "0x0000000000000000000000000000000000000000";
  const isPayer = address?.toLowerCase() === payer.toLowerCase();
  const past = BigInt(Math.floor(Date.now() / 1000)) > deadline;
  const leftover = totalFunded - totalClaimed;
  const progress =
    totalFunded > 0n ? Number((totalClaimed * 100n) / totalFunded) : 0;
  const recipients = breakdown?.[0] ?? [];
  const amounts = breakdown?.[1] ?? [];
  const claimedFlags = breakdown?.[2] ?? [];
  const claimedCount = claimedFlags.filter(Boolean).length;

  if (!exists) {
    return (
      <Shell>
        <div className="flex flex-1 items-center justify-center text-muted">
          Payout #{roundIdParam} doesn&apos;t exist.
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="rise-in space-y-6 pt-2">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted">Payout #{roundIdParam}</p>
            <h1 className="text-2xl font-semibold sm:text-3xl">
              {formatMon(totalFunded)} MON
            </h1>
            <p className="mt-1 text-sm text-muted">
              from <span className="font-mono">{shortAddress(payer)}</span> ·{" "}
              {closed ? "closed" : deadlineLabel(deadline)}
            </p>
          </div>
          <button
            onClick={copyLink}
            className="rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-medium hover:border-primary hover:text-primary transition-colors"
          >
            {copied ? "Copied ✓" : "Copy claim link"}
          </button>
        </div>

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
                <p className="font-medium">
                  {formatMon(leftover)} MON unclaimed
                </p>
                <p className="text-sm text-muted">
                  {past
                    ? "The claim window has ended — you can take the leftovers back."
                    : "Reclaim unlocks when the claim window ends."}
                </p>
              </div>
              <button
                onClick={doReclaim}
                disabled={busy || !past || leftover === 0n}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-strong transition-colors disabled:opacity-50"
              >
                {busy ? "Reclaiming…" : "Reclaim leftovers"}
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-danger">{error}</p>}
          </div>
        )}
        {closed && (
          <p className="text-sm text-muted">
            This payout is closed — leftovers were returned to the sender.
          </p>
        )}
      </div>
    </Shell>
  );
}
