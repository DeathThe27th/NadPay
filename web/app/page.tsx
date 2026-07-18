"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { isAddress, parseEther, parseEventLogs } from "viem";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
} from "wagmi";
import { NADPAY_ABI, NADPAY_ADDRESS } from "@/lib/nadpay";
import { monadTestnet } from "@/lib/wagmi";
import { formatMon, shortAddress } from "@/lib/format";
import { ConnectGate, Shell } from "@/components/shell";

type Row = { address: string; amount: string };

const CLAIM_WINDOWS = [
  { label: "24 hours", seconds: 86400 },
  { label: "3 days", seconds: 3 * 86400 },
  { label: "7 days", seconds: 7 * 86400 },
  { label: "14 days", seconds: 14 * 86400 },
] as const;

function rowError(row: Row): string | null {
  if (!row.address && !row.amount) return null;
  if (!isAddress(row.address)) return "invalid address";
  try {
    if (parseEther(row.amount) <= 0n) return "amount must be > 0";
  } catch {
    return "invalid amount";
  }
  return null;
}

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const [rows, setRows] = useState<Row[]>([{ address: "", amount: "" }]);
  const [loadedTemplate, setLoadedTemplate] = useState(false);
  const [windowSeconds, setWindowSeconds] = useState<number>(7 * 86400);
  const [busy, setBusy] = useState<"save" | "create" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdRound, setCreatedRound] = useState<bigint | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: template, refetch: refetchTemplate } = useReadContract({
    address: NADPAY_ADDRESS,
    abi: NADPAY_ABI,
    functionName: "getRecipients",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Prefill the editor from the on-chain template once per connection.
  useEffect(() => {
    if (!template || loadedTemplate) return;
    const [recipients, amounts] = template;
    if (recipients.length > 0) {
      setRows(
        recipients.map((recipient, i) => ({
          address: recipient,
          amount: formatMon(amounts[i]),
        })),
      );
    }
    setLoadedTemplate(true);
  }, [template, loadedTemplate]);

  useEffect(() => {
    setLoadedTemplate(false);
    setCreatedRound(null);
  }, [address]);

  const filledRows = rows.filter((row) => row.address || row.amount);
  const validRows = filledRows.filter(
    (row) => rowError(row) === null && row.address,
  );
  const allValid =
    filledRows.length > 0 && filledRows.every((row) => rowError(row) === null);

  const total = useMemo(() => {
    try {
      return validRows.reduce((sum, row) => sum + parseEther(row.amount), 0n);
    } catch {
      return 0n;
    }
  }, [validRows]);

  const matchesTemplate = useMemo(() => {
    if (!template) return false;
    const [recipients, amounts] = template;
    if (recipients.length !== validRows.length || recipients.length === 0)
      return false;
    return validRows.every(
      (row, i) =>
        row.address.toLowerCase() === recipients[i].toLowerCase() &&
        parseEther(row.amount) === amounts[i],
    );
  }, [template, validRows]);

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
    setError(null);
  }

  async function saveTeam() {
    if (!allValid || validRows.length === 0) return;
    setBusy("save");
    setError(null);
    try {
      const hash = await writeContractAsync({
        address: NADPAY_ADDRESS,
        abi: NADPAY_ABI,
        functionName: "setRecipients",
        args: [
          validRows.map((row) => row.address as `0x${string}`),
          validRows.map((row) => parseEther(row.amount)),
        ],
        chainId: monadTestnet.id,
      });
      await publicClient!.waitForTransactionReceipt({ hash });
      await refetchTemplate();
    } catch (e) {
      setError(e instanceof Error ? e.message.split("\n")[0] : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function createPayout() {
    if (!allValid || validRows.length === 0 || total === 0n) return;
    setBusy("create");
    setError(null);
    try {
      const common = {
        address: NADPAY_ADDRESS,
        abi: NADPAY_ABI,
        chainId: monadTestnet.id,
        value: total,
      } as const;
      const hash = matchesTemplate
        ? await writeContractAsync({
            ...common,
            functionName: "createRound",
            args: [BigInt(windowSeconds)],
          })
        : await writeContractAsync({
            ...common,
            functionName: "createRoundCustom",
            args: [
              validRows.map((row) => row.address as `0x${string}`),
              validRows.map((row) => parseEther(row.amount)),
              BigInt(windowSeconds),
            ],
          });
      const receipt = await publicClient!.waitForTransactionReceipt({ hash });
      const [created] = parseEventLogs({
        abi: NADPAY_ABI,
        logs: receipt.logs,
        eventName: "RoundCreated",
      });
      setCreatedRound(created.args.roundId);
    } catch (e) {
      setError(
        e instanceof Error ? e.message.split("\n")[0] : "Payout failed",
      );
    } finally {
      setBusy(null);
    }
  }

  async function copyLink() {
    if (createdRound === null) return;
    await navigator.clipboard.writeText(
      `${window.location.origin}/claim/${createdRound}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  if (!isConnected) {
    return (
      <Shell>
        <ConnectGate headline="Payroll in one link." />
      </Shell>
    );
  }

  if (createdRound !== null) {
    const claimPath = `/claim/${createdRound}`;
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 rise-in">
          <div className="ticket w-full max-w-md rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <p className="text-sm font-medium text-success">Payout funded ✓</p>
            <h1 className="mt-1 text-2xl font-semibold">
              {formatMon(total)} MON is ready to claim
            </h1>
            <p className="mt-2 text-sm text-muted">
              Drop this link in your team chat. Each member connects their
              wallet and claims their share — once.
            </p>
            <div className="ticket-tear mt-6 pt-6">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
                <span className="min-w-0 flex-1 truncate font-mono text-sm">
                  {typeof window !== "undefined"
                    ? `${window.location.host}${claimPath}`
                    : claimPath}
                </span>
                <button
                  onClick={copyLink}
                  className="shrink-0 rounded-lg bg-primary px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-primary-strong transition-colors"
                >
                  {copied ? "Copied ✓" : "Copy"}
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            <Link
              href={`/round/${createdRound}`}
              className="font-medium text-primary hover:underline"
            >
              Track this payout →
            </Link>
            <button
              onClick={() => setCreatedRound(null)}
              className="text-muted hover:text-foreground transition-colors"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="rise-in space-y-6 pt-2">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">My team</h1>
          <p className="mt-1 text-sm text-muted">
            Preset who gets paid and how much. Saved on-chain, reused every
            payout.
          </p>
        </div>

        <div className="space-y-2">
          {rows.map((row, i) => {
            const err = rowError(row);
            return (
              <div key={i} className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <input
                    value={row.address}
                    onChange={(e) => updateRow(i, { address: e.target.value })}
                    placeholder="0x wallet address"
                    spellCheck={false}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm placeholder:text-muted/70 focus:border-primary focus:outline-none"
                  />
                  {err && <p className="mt-1 text-xs text-danger">{err}</p>}
                </div>
                <div className="relative w-32 shrink-0">
                  <input
                    value={row.amount}
                    onChange={(e) => updateRow(i, { amount: e.target.value })}
                    placeholder="0"
                    inputMode="decimal"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 pr-12 text-right font-mono text-sm tabular placeholder:text-muted/70 focus:border-primary focus:outline-none"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted">
                    MON
                  </span>
                </div>
                <button
                  onClick={() =>
                    setRows((prev) =>
                      prev.length === 1
                        ? [{ address: "", amount: "" }]
                        : prev.filter((_, j) => j !== i),
                    )
                  }
                  aria-label="Remove row"
                  className="mt-1.5 grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger transition-colors"
                >
                  ✕
                </button>
              </div>
            );
          })}
          <button
            onClick={() =>
              setRows((prev) => [...prev, { address: "", amount: "" }])
            }
            className="w-full rounded-xl border border-dashed border-border py-2.5 text-sm font-medium text-muted hover:border-primary hover:text-primary transition-colors"
          >
            + Add teammate
          </button>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">Total per payout</span>
            <span className="font-mono text-lg font-semibold tabular">
              {formatMon(total)} MON
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="window" className="text-sm text-muted">
              Claim window
            </label>
            <select
              id="window"
              value={windowSeconds}
              onChange={(e) => setWindowSeconds(Number(e.target.value))}
              className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none"
            >
              {CLAIM_WINDOWS.map((w) => (
                <option key={w.seconds} value={w.seconds}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={saveTeam}
              disabled={
                busy !== null ||
                !allValid ||
                validRows.length === 0 ||
                matchesTemplate
              }
              className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-semibold hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:hover:border-border disabled:hover:text-foreground"
            >
              {busy === "save"
                ? "Saving…"
                : matchesTemplate
                  ? "Team saved ✓"
                  : "Save team on-chain"}
            </button>
            <button
              onClick={createPayout}
              disabled={busy !== null || !allValid || total === 0n}
              className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-strong transition-colors disabled:opacity-50"
            >
              {busy === "create"
                ? "Funding payout…"
                : `Create payout · ${formatMon(total)} MON`}
            </button>
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <p className="text-xs text-muted">
            Creating a payout funds it in full from your wallet
            {address ? ` (${shortAddress(address)})` : ""}. Anything unclaimed
            after the window comes back to you.
          </p>
        </div>
      </div>
    </Shell>
  );
}
