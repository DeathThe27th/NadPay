"use client";

import { use, useState } from "react";
import { useAccount, usePublicClient, useReadContract, useWriteContract } from "wagmi";
import { NADPAY_ABI, NADPAY_ADDRESS } from "@/lib/nadpay";
import { monadTestnet } from "@/lib/wagmi";
import { deadlineLabel, formatMon, shortAddress } from "@/lib/format";
import { ConnectGate, Shell } from "@/components/shell";
import { SwapPanel } from "@/components/swap-panel";
import { SWAP_CONFIG } from "@/lib/swap";

export default function ClaimPage({
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
  const [justClaimed, setJustClaimed] = useState(false);
  const [receiveAs, setReceiveAs] = useState<"MON" | "USDC">("MON");

  const { data: round, refetch: refetchRound } = useReadContract({
    address: NADPAY_ADDRESS,
    abi: NADPAY_ABI,
    functionName: "getRound",
    args: [roundId],
  });

  const { data: allocation, refetch: refetchAllocation } = useReadContract({
    address: NADPAY_ADDRESS,
    abi: NADPAY_ABI,
    functionName: "allocationOf",
    args: address ? [roundId, address] : undefined,
    query: { enabled: !!address },
  });

  const { data: claimed, refetch: refetchClaimed } = useReadContract({
    address: NADPAY_ADDRESS,
    abi: NADPAY_ABI,
    functionName: "hasClaimed",
    args: address ? [roundId, address] : undefined,
    query: { enabled: !!address },
  });

  async function doClaim() {
    setBusy(true);
    setError(null);
    try {
      const hash = await writeContractAsync({
        address: NADPAY_ADDRESS,
        abi: NADPAY_ABI,
        functionName: "claim",
        args: [roundId],
        chainId: monadTestnet.id,
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      setJustClaimed(true);
      await Promise.all([refetchRound(), refetchAllocation(), refetchClaimed()]);
    } catch (e) {
      setError(e instanceof Error ? e.message.split("\n")[0] : "Claim failed");
    } finally {
      setBusy(false);
    }
  }

  if (!isConnected) {
    return (
      <Shell>
        <ConnectGate headline="You've got a payout waiting." />
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
  const live =
    exists && !closed && BigInt(Math.floor(Date.now() / 1000)) <= deadline;
  const progress =
    totalFunded > 0n ? Number((totalClaimed * 100n) / totalFunded) : 0;

  let body: React.ReactNode;
  if (!exists) {
    body = (
      <StatusCard tone="muted" title="Payout not found">
        This link doesn&apos;t match any payout. Double-check it with whoever
        sent it to you.
      </StatusCard>
    );
  } else if (claimed) {
    body = (
      <>
        <StatusCard tone="success" title={justClaimed ? "Paid ✓" : "Already claimed"}>
          {justClaimed
            ? `${formatMon(allocation ?? 0n)} MON just landed in your wallet.`
            : "This wallet has already claimed its share of this payout."}
        </StatusCard>
        {justClaimed &&
          receiveAs === "USDC" &&
          SWAP_CONFIG &&
          address &&
          allocation != null &&
          allocation > 0n && (
            <div className="mt-4">
              <SwapPanel
                config={SWAP_CONFIG}
                amountWei={allocation}
                recipient={address}
              />
            </div>
          )}
      </>
    );
  } else if (!live) {
    body = (
      <StatusCard tone="muted" title="This payout has closed">
        The claim window has ended{closed ? " and leftovers were reclaimed" : ""}.
        Ask the sender to include you in the next round.
      </StatusCard>
    );
  } else if (!allocation || allocation === 0n) {
    body = (
      <StatusCard tone="danger" title="This wallet isn't on the list">
        <span className="font-mono">{address && shortAddress(address)}</span>{" "}
        has no allocation in this payout. If you were expecting one, try the
        wallet your team lead whitelisted.
      </StatusCard>
    );
  } else {
    body = (
      <div className="ticket w-full rounded-2xl border border-border bg-surface p-6 sm:p-8 text-center">
        <p className="text-sm text-muted">You&apos;ve been allocated</p>
        <p className="mt-2 font-mono text-5xl font-semibold tabular sm:text-6xl">
          {formatMon(allocation)}
          <span className="ml-2 text-2xl text-muted">MON</span>
        </p>
        <p className="mt-2 text-sm text-muted">
          from <span className="font-mono">{shortAddress(payer)}</span> ·{" "}
          {deadlineLabel(deadline)}
        </p>
        <div className="ticket-tear mt-6 pt-6 space-y-3">
          <div className="flex justify-center gap-1 rounded-xl border border-border bg-background p-1 text-sm font-medium">
            {(["MON", "USDC"] as const).map((token) => {
              const unavailable = token === "USDC" && !SWAP_CONFIG;
              return (
                <button
                  key={token}
                  onClick={() => !unavailable && setReceiveAs(token)}
                  disabled={unavailable}
                  className={`flex-1 rounded-lg py-1.5 transition-colors ${
                    receiveAs === token
                      ? "bg-primary text-white"
                      : unavailable
                        ? "text-muted/50 cursor-not-allowed"
                        : "text-muted hover:text-foreground"
                  }`}
                >
                  Receive {token}
                  {unavailable && " · soon"}
                </button>
              );
            })}
          </div>
          {!SWAP_CONFIG && (
            <p className="text-xs text-muted">
              USDC payouts (one extra swap via Uniswap) are paused — Uniswap
              hasn&apos;t redeployed since the Monad testnet reset. You&apos;ll
              receive MON.
            </p>
          )}
          <button
            onClick={doClaim}
            disabled={busy}
            className="w-full rounded-xl bg-primary py-3 text-base font-semibold text-white hover:bg-primary-strong transition-colors disabled:opacity-60"
          >
            {busy
              ? "Claiming…"
              : receiveAs === "USDC"
                ? "Claim MON, then swap"
                : "Claim my MON"}
          </button>
          {receiveAs === "USDC" && (
            <p className="text-xs text-muted">
              Two steps: claim your MON first, then confirm a separate
              MON→USDC swap on Uniswap. Not atomic — you can stop after step
              one and keep MON.
            </p>
          )}
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <Shell>
      <div className="flex flex-1 flex-col items-center justify-center gap-6 rise-in">
        <div className="w-full max-w-md space-y-6">
          {body}
          {exists && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted">
                <span>
                  {formatMon(totalClaimed)} of {formatMon(totalFunded)} MON
                  claimed
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
          )}
        </div>
      </div>
    </Shell>
  );
}

function StatusCard({
  tone,
  title,
  children,
}: {
  tone: "success" | "danger" | "muted";
  title: string;
  children: React.ReactNode;
}) {
  const toneClasses =
    tone === "success"
      ? "border-success/40 bg-success-soft"
      : tone === "danger"
        ? "border-danger/40 bg-danger-soft"
        : "border-border bg-surface";
  return (
    <div className={`w-full rounded-2xl border p-6 sm:p-8 text-center ${toneClasses}`}>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-muted">{children}</p>
    </div>
  );
}
