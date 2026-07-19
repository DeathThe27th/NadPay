"use client";

import { useConnect } from "wagmi";
import { ShieldCheck } from "lucide-react";
import { Hero10 } from "@/components/ui/hero-10";
import { FloatingNav } from "@/components/navbar";

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

const HERO_IMAGES = ["/hero/team.svg", "/hero/ticket.svg", "/hero/claimed.svg"];

const HERO_ALTS = [
  "Team preset: four wallet addresses with MON amounts, saved on-chain",
  "Funded pay ticket with the claim link nadpay.xyz/claim/7 ready to copy",
  "Claim success: 1.6 MON settled to a teammate's wallet on Monad",
];

export function Landing() {
  const { connect, connectors, isPending } = useConnect();
  const noWallet = connectors.length === 0;

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip">
      <FloatingNav />

      {/* Animated backdrop: drifting aurora over a faint dotted grid. */}
      <div className="aurora" aria-hidden />
      <div className="dot-grid" aria-hidden />

      <main className="relative flex-1 pt-12 sm:pt-8">
        <Hero10
          title="The whole payroll,"
          titleLine2Prefix="in"
          titleHighlight="one link."
          description="Preset your team, fund payday with a single transaction, and drop one claim link in the chat. Everyone pulls their own pay — on Monad."
          socialProof={
            noWallet
              ? "No wallet extension detected — install MetaMask or another injected wallet."
              : "Monad testnet · no funds at risk"
          }
          images={HERO_IMAGES}
          imageAlts={HERO_ALTS}
          animation="subtle"
          primaryCTA={{
            ctaEnabled: true,
            text: isPending ? "Connecting…" : "Connect wallet to start",
            onClick: () => connect({ connector: connectors[0] }),
            disabled: isPending || noWallet,
            size: "lg",
            className:
              "rounded-full px-7 text-base font-semibold shadow-lg shadow-primary/25",
          }}
          secondaryCTA={{
            ctaEnabled: true,
            text: "How it works",
            link: "#how-it-works",
            size: "lg",
            className: "rounded-full px-6 text-base",
          }}
        />

        <section
          id="how-it-works"
          className="mx-auto max-w-4xl scroll-mt-24 px-6 pb-20 sm:pb-24"
        >
          <h2 className="text-center font-display text-2xl text-balance sm:text-3xl">
            Payday in three moves
          </h2>
          <ol className="mt-8 grid gap-3 sm:grid-cols-3">
            {STEPS.map((step) => (
              <li
                key={step.n}
                className="rounded-2xl border border-border bg-background/80 p-5 backdrop-blur-sm"
              >
                <span className="font-display text-2xl text-primary">
                  {step.n}
                </span>
                <h3 className="mt-2 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="safety" className="mx-auto max-w-2xl scroll-mt-24 px-6 pb-20">
          <div className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 sm:items-center">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-success-soft text-success">
              <ShieldCheck className="size-5" aria-hidden />
            </span>
            <p className="text-sm text-muted">
              Pull-based payouts mean a typo&apos;d address never loses funds —
              only whitelisted wallets can claim, each exactly once, and
              leftovers are reclaimable after the deadline.
            </p>
          </div>
        </section>
      </main>

      <footer className="relative px-5 py-5 text-center text-xs text-muted">
        Runs on Monad testnet · payouts settle in native MON
      </footer>
    </div>
  );
}
