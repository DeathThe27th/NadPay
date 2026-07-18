"use client";

import { useConnect } from "wagmi";
import { LogoMark } from "@/components/logo";

const STEPS = [
  {
    n: "01",
    title: "Preset your team",
    body: "Addresses and amounts, saved on-chain once. No weekly re-entry.",
  },
  {
    n: "02",
    title: "Fund payday",
    body: "One transaction funds the entire payroll round in native MON.",
  },
  {
    n: "03",
    title: "Share one link",
    body: "Everyone claims their own pay. Unclaimed funds return to you.",
  },
] as const;

export function Landing() {
  const { connect, connectors, isPending } = useConnect();

  return (
    <div className="flex flex-1 flex-col justify-center gap-10 py-6 rise-in sm:gap-12">
      <div className="space-y-5 text-center">
        <div className="flex justify-center">
          <LogoMark className="size-16 sm:size-20" />
        </div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Payroll in <span className="text-primary">one link.</span>
        </h1>
        <p className="mx-auto max-w-md text-balance text-muted sm:text-lg">
          Preset your team, fund payday with a single transaction, and drop one
          claim link in the chat. Everyone pulls their own pay — on Monad.
        </p>
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => connect({ connector: connectors[0] })}
            disabled={isPending || connectors.length === 0}
            className="rounded-full bg-primary px-7 py-3 font-semibold text-white shadow-lg shadow-primary/25 hover:bg-primary-strong transition-colors disabled:opacity-60"
          >
            {isPending ? "Connecting…" : "Connect wallet to start"}
          </button>
          {connectors.length === 0 ? (
            <p className="text-sm text-muted">
              No wallet extension detected — install MetaMask or another
              injected wallet.
            </p>
          ) : (
            <p className="text-xs text-muted">
              Monad testnet · no funds at risk
            </p>
          )}
        </div>
      </div>

      <ol className="grid gap-3 sm:grid-cols-3">
        {STEPS.map((step) => (
          <li
            key={step.n}
            className="rounded-2xl border border-border bg-surface p-4 sm:p-5"
          >
            <span className="font-mono text-xs font-semibold text-primary">
              {step.n}
            </span>
            <h2 className="mt-1 font-semibold">{step.title}</h2>
            <p className="mt-1 text-sm text-muted">{step.body}</p>
          </li>
        ))}
      </ol>

      <p className="text-center text-xs text-muted">
        Pull-based payouts mean a typo&apos;d address never loses funds — only
        whitelisted wallets can claim, each exactly once, and leftovers are
        reclaimable after the deadline.
      </p>
    </div>
  );
}
