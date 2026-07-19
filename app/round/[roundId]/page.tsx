"use client";

import { use, useState } from "react";
import { useAccount, useReadContract } from "wagmi";
import { NADPAY_ABI, NADPAY_ADDRESS } from "@/lib/nadpay";
import { deadlineLabel, formatMon, shortAddress } from "@/lib/format";
import { ConnectGate, Shell } from "@/components/shell";
import { RoundStatus } from "@/components/round-status";

export default function RoundPage({
  params,
}: {
  params: Promise<{ roundId: string }>;
}) {
  const { roundId: roundIdParam } = use(params);
  const roundId = BigInt(roundIdParam);
  const { isConnected } = useAccount();

  const [copied, setCopied] = useState(false);

  const { data: round } = useReadContract({
    address: NADPAY_ADDRESS,
    abi: NADPAY_ABI,
    functionName: "getRound",
    args: [roundId],
  });

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

  const [payer, totalFunded, , deadline, closed] = round;
  const exists = payer !== "0x0000000000000000000000000000000000000000";

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
            <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              Payout #{roundIdParam}
            </h1>
            <p className="mt-1 font-mono text-lg font-semibold tabular">
              {formatMon(totalFunded)} MON
            </p>
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

        <RoundStatus roundId={roundId} />
      </div>
    </Shell>
  );
}
