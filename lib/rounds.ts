import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { NADPAY_ABI, NADPAY_ADDRESS } from "@/lib/nadpay";

// The Monad testnet RPC caps eth_getLogs at a 100-block range, so history is
// derived purely from view functions: enumerate 0..nextRoundId-1 via multicall
// and keep the payer's rounds.

export type RoundStatus = "active" | "fully-claimed" | "reclaimable" | "closed";

export type PayerRound = {
  id: bigint;
  totalFunded: bigint;
  totalClaimed: bigint;
  deadline: bigint;
  closed: boolean;
  recipientCount: number;
  claimedCount: number;
};

export type PayerSummary = {
  totalPaid: bigint;
  roundsCreated: number;
  lockedUnclaimed: bigint;
  pendingClaims: number;
};

export const STATUS_LABEL: Record<RoundStatus, string> = {
  active: "Active",
  "fully-claimed": "Fully claimed",
  reclaimable: "Reclaimable",
  closed: "Closed",
};

export function roundStatus(round: {
  totalFunded: bigint;
  totalClaimed: bigint;
  deadline: bigint;
  closed: boolean;
}): RoundStatus {
  if (round.closed) return "closed";
  if (round.totalClaimed >= round.totalFunded) return "fully-claimed";
  if (BigInt(Math.floor(Date.now() / 1000)) > round.deadline)
    return "reclaimable";
  return "active";
}

const POLL_MS = 15_000;

export function usePayerRounds(payer: `0x${string}` | undefined) {
  const nextIdRead = useReadContract({
    address: NADPAY_ADDRESS,
    abi: NADPAY_ABI,
    functionName: "nextRoundId",
    query: { enabled: !!payer, refetchInterval: POLL_MS },
  });

  const roundCount = Number(nextIdRead.data ?? 0n);

  const roundsRead = useReadContracts({
    contracts: Array.from({ length: roundCount }, (_, i) => ({
      address: NADPAY_ADDRESS,
      abi: NADPAY_ABI,
      functionName: "getRound",
      args: [BigInt(i)],
    })),
    query: { enabled: !!payer && roundCount > 0, refetchInterval: POLL_MS },
  });

  const payerRoundIds = useMemo(() => {
    if (!payer || !roundsRead.data) return [];
    const ids: bigint[] = [];
    roundsRead.data.forEach((entry, i) => {
      if (entry.status !== "success") return;
      const [roundPayer] = entry.result as unknown as readonly [
        `0x${string}`,
        bigint,
        bigint,
        bigint,
        boolean,
      ];
      if (roundPayer.toLowerCase() === payer.toLowerCase()) ids.push(BigInt(i));
    });
    return ids;
  }, [payer, roundsRead.data]);

  const recipientsRead = useReadContracts({
    contracts: payerRoundIds.map((id) => ({
      address: NADPAY_ADDRESS,
      abi: NADPAY_ABI,
      functionName: "getRoundRecipients",
      args: [id],
    })),
    query: { enabled: payerRoundIds.length > 0, refetchInterval: POLL_MS },
  });

  const rounds = useMemo<PayerRound[]>(() => {
    if (!roundsRead.data) return [];
    return payerRoundIds
      .map((id, i) => {
        const roundEntry = roundsRead.data[Number(id)];
        if (roundEntry?.status !== "success") return null;
        const [, totalFunded, totalClaimed, deadline, closed] =
          roundEntry.result as unknown as readonly [
            `0x${string}`,
            bigint,
            bigint,
            bigint,
            boolean,
          ];
        const recipientsEntry = recipientsRead.data?.[i];
        const breakdown =
          recipientsEntry?.status === "success"
            ? (recipientsEntry.result as unknown as readonly [
                readonly `0x${string}`[],
                readonly bigint[],
                readonly boolean[],
              ])
            : null;
        const claimedFlags = breakdown?.[2] ?? [];
        return {
          id,
          totalFunded,
          totalClaimed,
          deadline,
          closed,
          recipientCount: breakdown?.[0].length ?? 0,
          claimedCount: claimedFlags.filter(Boolean).length,
        };
      })
      .filter((round): round is PayerRound => round !== null)
      .sort((a, b) => (a.id > b.id ? -1 : 1));
  }, [payerRoundIds, roundsRead.data, recipientsRead.data]);

  const summary = useMemo<PayerSummary>(() => {
    let totalPaid = 0n;
    let lockedUnclaimed = 0n;
    let pendingClaims = 0;
    for (const round of rounds) {
      totalPaid += round.totalClaimed;
      if (!round.closed) lockedUnclaimed += round.totalFunded - round.totalClaimed;
      if (roundStatus(round) === "active")
        pendingClaims += round.recipientCount - round.claimedCount;
    }
    return { totalPaid, roundsCreated: rounds.length, lockedUnclaimed, pendingClaims };
  }, [rounds]);

  const isLoading =
    nextIdRead.isLoading || roundsRead.isLoading || recipientsRead.isLoading;
  const isError =
    nextIdRead.isError || roundsRead.isError || recipientsRead.isError;

  async function refetch() {
    await nextIdRead.refetch();
    await Promise.all([roundsRead.refetch(), recipientsRead.refetch()]);
  }

  return { rounds, summary, isLoading, isError, refetch };
}
