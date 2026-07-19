"use client";

import Link from "next/link";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { monadTestnet } from "@/lib/wagmi";
import { shortAddress } from "@/lib/format";
import { LogoMark } from "@/components/logo";

export function Logo() {
  return (
    <Link href="/" aria-label="NadPay home" className="flex items-center">
      <LogoMark className="size-8" />
    </Link>
  );
}

export function ConnectControl() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        className="group flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm font-medium hover:border-danger hover:text-danger transition-colors"
        title="Disconnect"
      >
        <span className="size-2 rounded-full bg-success group-hover:bg-danger transition-colors" />
        <span className="font-mono tabular">{shortAddress(address)}</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: connectors[0] })}
      disabled={isPending || connectors.length === 0}
      className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-strong transition-colors disabled:opacity-60"
    >
      {isPending ? "Connecting…" : "Connect wallet"}
    </button>
  );
}

function NetworkBanner() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected || chainId === monadTestnet.id) return null;

  return (
    <div className="mx-auto mb-4 flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm">
      <span>
        Your wallet is on the wrong network — NadPay runs on Monad testnet.
      </span>
      <button
        onClick={() => switchChain({ chainId: monadTestnet.id })}
        disabled={isPending}
        className="rounded-lg bg-danger px-3 py-1.5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? "Switching…" : "Switch network"}
      </button>
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <Logo />
        <ConnectControl />
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pb-10 sm:px-8">
        <NetworkBanner />
        {children}
      </main>
      <footer className="px-5 py-4 text-center text-xs text-muted">
        Runs on Monad testnet · payouts settle in native MON
      </footer>
    </div>
  );
}

export function ConnectGate({ headline }: { headline: string }) {
  const { connect, connectors, isPending } = useConnect();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center rise-in">
      <LogoMark className="size-14" />
      <div className="space-y-2">
        <h1 className="font-display text-2xl sm:text-3xl">{headline}</h1>
        <p className="mx-auto max-w-sm text-muted">
          Connect your wallet on Monad testnet to continue.
        </p>
      </div>
      <button
        onClick={() => connect({ connector: connectors[0] })}
        disabled={isPending || connectors.length === 0}
        className="rounded-full bg-primary px-6 py-2.5 font-semibold text-white hover:bg-primary-strong transition-colors disabled:opacity-60"
      >
        {isPending ? "Connecting…" : "Connect wallet"}
      </button>
      {connectors.length === 0 && (
        <p className="text-sm text-muted">
          No wallet extension detected — install MetaMask or another injected
          wallet.
        </p>
      )}
    </div>
  );
}
