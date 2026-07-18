"use client";

import Link from "next/link";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { shortAddress } from "@/lib/format";
import { LogoMark } from "@/components/logo";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 font-semibold text-lg">
      <LogoMark className="size-7" />
      NadPay
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

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <Logo />
        <ConnectControl />
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 pb-10 sm:px-8">
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
        <h1 className="text-2xl font-semibold sm:text-3xl">{headline}</h1>
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
