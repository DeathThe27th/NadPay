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
import { activeChain } from "@/lib/wagmi";
import { formatMon, shortAddress } from "@/lib/format";
import { Shell } from "@/components/shell";
import { Landing } from "@/components/landing";
import { CsvImport } from "@/components/csv-import";
import { PayoutHistory, SummaryStrip } from "@/components/history";
import { RoundStatus } from "@/components/round-status";
import { usePayerRounds } from "@/lib/rounds";
import type { CsvRow } from "@/lib/csv";

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

  const history = usePayerRounds(address);

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

  function importRows(csvRows: CsvRow[]) {
    setRows(csvRows.map((row) => ({ address: row.address, amount: row.amount })));
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
        chainId: activeChain.id,
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
        chainId: activeChain.id,
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
      void history.refetch();
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
    return <Landing />;
  }

  if (createdRound !== null) {
    const claimPath = `/claim/${createdRound}`;
    return (
      <Shell>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 rise-in py-8">
          <div className="ticket w-full max-w-md rounded-2xl border border-border bg-surface p-6 sm:p-8">
            <p className="text-sm font-medium text-success">Payout funded ✓</p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
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
          <div className="w-full max-w-md space-y-3">
            <h2 className="font-display text-lg font-semibold">Claim status</h2>
            <RoundStatus roundId={createdRound} onChanged={history.refetch} />
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
      <div className="dashboard-workspace rise-in">
        <header className="dashboard-intro">
          <div>
            <p>Connected payday workspace</p>
            <h1>Move payroll in one transaction.</h1>
            <span>Set the team, review the total, then fund the round.</span>
          </div>
          <div className="dashboard-route" aria-hidden="true"><i /><i /><i /></div>
        </header>

        <div className="dashboard-grid">
          <section className="team-editor" aria-labelledby="team-heading">
            <div className="workspace-heading">
              <div>
                <h2 id="team-heading">My team</h2>
                <p>Wallet addresses and recurring MON allocations.</p>
              </div>
              <span>{validRows.length} recipients</span>
            </div>

            <div className="space-y-2">
              {rows.map((row, i) => {
                const err = rowError(row);
                return (
                  <div key={i} className="recipient-row">
                    <span className="recipient-index">{String(i + 1).padStart(2, "0")}</span>
                    <div className="min-w-0 flex-1">
                      <input
                        value={row.address}
                        onChange={(e) => updateRow(i, { address: e.target.value })}
                        placeholder="0x wallet address"
                        aria-label={`Recipient ${i + 1} wallet address`}
                        spellCheck={false}
                        className="workspace-input font-mono"
                      />
                      {err && <p className="mt-1 text-xs text-danger">{err}</p>}
                    </div>
                    <div className="amount-input">
                      <input
                        value={row.amount}
                        onChange={(e) => updateRow(i, { amount: e.target.value })}
                        placeholder="0"
                        aria-label={`Recipient ${i + 1} amount in MON`}
                        inputMode="decimal"
                        className="workspace-input text-right font-mono tabular"
                      />
                      <span>MON</span>
                    </div>
                    <button
                      onClick={() => setRows((prev) => prev.length === 1 ? [{ address: "", amount: "" }] : prev.filter((_, j) => j !== i))}
                      aria-label={`Remove recipient ${i + 1}`}
                      className="remove-recipient"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
              <button onClick={() => setRows((prev) => [...prev, { address: "", amount: "" }])} className="add-recipient">
                <span>+</span> Add teammate
              </button>
              <CsvImport onApply={importRows} />
            </div>
          </section>

          <aside className="payout-console" aria-labelledby="payout-heading">
            <div className="console-signal"><i /><i /><i /><i /></div>
            <p id="payout-heading">Next payout</p>
            <div className="console-total"><strong>{formatMon(total)}</strong><span>MON</span></div>
            <div className="console-detail"><span>{validRows.length} recipients</span><span>{CLAIM_WINDOWS.find((w) => w.seconds === windowSeconds)?.label} to claim</span></div>
            <label htmlFor="window" className="console-field">
              <span>Claim window</span>
              <select id="window" value={windowSeconds} onChange={(e) => setWindowSeconds(Number(e.target.value))}>
                {CLAIM_WINDOWS.map((w) => <option key={w.seconds} value={w.seconds}>{w.label}</option>)}
              </select>
            </label>
            <div className="console-actions">
              <button onClick={saveTeam} disabled={busy !== null || !allValid || validRows.length === 0 || matchesTemplate} className="console-secondary">
                {busy === "save" ? "Saving…" : matchesTemplate ? "Team saved ✓" : "Save team on-chain"}
              </button>
              <button onClick={createPayout} disabled={busy !== null || !allValid || total === 0n} className="console-primary">
                {busy === "create" ? "Funding payout…" : "Fund payout"}
              </button>
            </div>
            {error && <p className="console-error">{error}</p>}
            <p className="console-note">Funds leave {address ? shortAddress(address) : "your wallet"} only after confirmation. Unclaimed MON can return after the window closes.</p>
          </aside>
        </div>

        <section className="history-workspace">
          <div className="workspace-heading">
            <div>
              <h2>Your payouts</h2>
              <p>Live claim status for every funded round.</p>
            </div>
            <span>On-chain history</span>
          </div>
          <SummaryStrip summary={history.summary} />
          <PayoutHistory
            rounds={history.rounds}
            isLoading={history.isLoading}
            isError={history.isError}
            refetch={history.refetch}
          />
        </section>
      </div>
    </Shell>
  );
}
