"use client";

import { useState } from "react";
import Link from "next/link";
import { deadlineLabel, formatMon } from "@/lib/format";
import {
  roundStatus,
  STATUS_LABEL,
  type PayerRound,
  type PayerSummary,
  type RoundStatus as Status,
} from "@/lib/rounds";
import { ReclaimButton, RoundStatus } from "@/components/round-status";

const BADGE_CLASSES: Record<Status, string> = {
  active: "bg-primary-soft text-primary-strong",
  "fully-claimed": "bg-success-soft text-success",
  reclaimable: "bg-danger-soft text-danger",
  closed: "bg-surface text-muted",
};

function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_CLASSES[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

/** At-a-glance totals derived from the payer's rounds. */
export function SummaryStrip({ summary }: { summary: PayerSummary }) {
  const stats = [
    { label: "Total paid out", value: formatMon(summary.totalPaid), unit: "MON" },
    { label: "Payout rounds", value: String(summary.roundsCreated) },
    {
      label: "Locked unclaimed",
      value: formatMon(summary.lockedUnclaimed),
      unit: "MON",
    },
    { label: "Pending claims", value: String(summary.pendingClaims) },
  ] as const;

  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-border bg-surface px-3 py-2.5"
        >
          <dt className="text-xs text-muted">{stat.label}</dt>
          <dd className="mt-0.5 font-mono text-lg font-semibold">
            {stat.value}
            {"unit" in stat && stat.unit && (
              <span className="ml-1 text-xs font-medium text-muted">
                {stat.unit}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function deadlineSummary(round: PayerRound): string {
  if (round.closed || BigInt(Math.floor(Date.now() / 1000)) > round.deadline) {
    return `ended ${new Date(Number(round.deadline) * 1000).toLocaleDateString(
      undefined,
      { month: "short", day: "numeric" },
    )}`;
  }
  return deadlineLabel(round.deadline);
}

/**
 * Every round the connected payer has created, newest first. Rows expand to
 * the shared per-recipient status view; reclaimable rows carry a direct
 * reclaim button.
 */
export function PayoutHistory({
  rounds,
  isLoading,
  isError,
  refetch,
}: {
  rounds: PayerRound[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<void>;
}) {
  const [expandedId, setExpandedId] = useState<bigint | null>(null);
  const [retrying, setRetrying] = useState(false);

  if (isError) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm text-muted">
          Couldn&apos;t load your payout history — the RPC may be having a
          moment.
        </p>
        <button
          onClick={async () => {
            setRetrying(true);
            try {
              await refetch();
            } finally {
              setRetrying(false);
            }
          }}
          disabled={retrying}
          className="rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold hover:border-primary hover:text-primary transition-colors disabled:opacity-60"
        >
          {retrying ? "Retrying…" : "Retry"}
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2" aria-hidden>
        <div className="h-14 animate-pulse rounded-2xl bg-surface" />
        <div className="h-14 animate-pulse rounded-2xl bg-surface" />
      </div>
    );
  }

  if (rounds.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-6 text-center">
        <p className="font-medium">No payouts yet</p>
        <p className="mt-1 text-sm text-muted">
          Fund your first round above — every payout you create shows up here
          with its live claim status.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
      {rounds.map((round) => {
        const status = roundStatus(round);
        const expanded = expandedId === round.id;
        const leftover = round.totalFunded - round.totalClaimed;
        return (
          <li key={round.id.toString()} className="bg-background">
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => setExpandedId(expanded ? null : round.id)}
                aria-expanded={expanded}
                className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-left"
              >
                <span className="font-mono text-sm font-semibold">
                  #{round.id.toString()}
                </span>
                <StatusBadge status={status} />
                <span className="font-mono text-sm tabular">
                  {formatMon(round.totalFunded)} MON
                </span>
                <span className="text-xs text-muted">
                  {round.claimedCount}/{round.recipientCount} claimed ·{" "}
                  {formatMon(round.totalClaimed)} MON claimed ·{" "}
                  {formatMon(leftover)} left · {deadlineSummary(round)}
                </span>
              </button>
              {status === "reclaimable" && (
                <ReclaimButton
                  roundId={round.id}
                  leftover={leftover}
                  onDone={refetch}
                />
              )}
              <Link
                href={`/round/${round.id}`}
                className="shrink-0 text-sm font-medium text-primary hover:underline"
              >
                Open
              </Link>
            </div>
            {expanded && (
              <div className="border-t border-border bg-surface/50 p-4">
                <RoundStatus roundId={round.id} onChanged={refetch} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
