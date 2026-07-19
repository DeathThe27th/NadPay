"use client";

import { useConnect } from "wagmi";
import { ShieldCheck } from "lucide-react";
import { DiaGradient } from "@/components/ui/dia-gradient";
import { Hero10 } from "@/components/ui/hero-10";
import { ConnectControl, Logo } from "@/components/shell";
import { LogoMark } from "@/components/logo";
import { NADPAY_ADDRESS } from "@/lib/nadpay";

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

// Dia-style aurora restated in NadPay's own palette, bottom → top:
// deep violet → brand purple → lavender near-white → magenta → transparent.
const AURORA_STOPS = [
  { offset: 0, color: "#231052" },
  { offset: 0.16, color: "#4C22C8" },
  { offset: 0.3, color: "#6D3EF0" },
  { offset: 0.44, color: "#A98FF5" },
  { offset: 0.56, color: "#E6DFFC" },
  { offset: 0.68, color: "#C79BFA" },
  { offset: 0.8, color: "#E070F0CC" },
  { offset: 0.92, color: "#F2A9F866" },
  { offset: 1, color: "#F9D3FC00" },
];

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
      <header className="relative z-10 flex items-center justify-between px-5 py-4 sm:px-8">
        <Logo />
        <ConnectControl />
      </header>

      <main className="relative flex-1">
        <div className="relative">
          {/* Dia-style aurora in NadPay purple, rising up behind the hero. */}
          {/* Masked at its base so the glow dissolves before the next section
              instead of ending in a hard band. */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-70 [mask-image:linear-gradient(to_top,transparent_3%,black_48%)]"
            aria-hidden
          >
            <DiaGradient stops={AURORA_STOPS} blur={18} />
          </div>
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
        </div>

        <section
          id="how-it-works"
          className="mx-auto max-w-4xl scroll-mt-24 px-6 pb-20 sm:pb-24"
        >
          <h2 className="text-center font-display text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Payday in three moves
          </h2>
          <ol className="mt-8 grid gap-3 sm:grid-cols-3">
            {STEPS.map((step) => (
              <li
                key={step.n}
                className="rounded-2xl border border-border bg-background/80 p-5 backdrop-blur-sm"
              >
                <span className="font-display text-2xl font-semibold text-primary">
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

      <footer className="relative border-t border-border/70">
        <div className="mx-auto w-full max-w-4xl px-6 py-10">
          <div className="flex flex-col justify-between gap-8 sm:flex-row">
            <div className="max-w-xs space-y-3">
              <LogoMark className="size-8" />
              <p className="text-sm text-muted">
                Recurring crypto payroll on Monad. Preset your team, fund
                payday once, share one claim link.
              </p>
            </div>
            <nav className="flex gap-12 text-sm" aria-label="Footer">
              <div className="space-y-2.5">
                <p className="font-medium">Product</p>
                <ul className="space-y-2 text-muted">
                  <li>
                    <a
                      href="#how-it-works"
                      className="hover:text-foreground transition-colors"
                    >
                      How it works
                    </a>
                  </li>
                  <li>
                    <a
                      href="#safety"
                      className="hover:text-foreground transition-colors"
                    >
                      Safety
                    </a>
                  </li>
                </ul>
              </div>
              <div className="space-y-2.5">
                <p className="font-medium">On-chain</p>
                <ul className="space-y-2 text-muted">
                  <li>
                    <a
                      href={`https://testnet.monadexplorer.com/address/${NADPAY_ADDRESS}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-foreground transition-colors"
                    >
                      Contract
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://www.monad.xyz"
                      target="_blank"
                      rel="noreferrer"
                      className="hover:text-foreground transition-colors"
                    >
                      Monad
                    </a>
                  </li>
                </ul>
              </div>
            </nav>
          </div>
          <div className="mt-8 flex flex-col justify-between gap-2 border-t border-border/70 pt-5 text-xs text-muted sm:flex-row">
            <span>Runs on Monad testnet · payouts settle in native MON</span>
            <span>© {new Date().getFullYear()} NadPay</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
