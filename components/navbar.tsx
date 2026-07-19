"use client";

import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { ConnectControl } from "@/components/shell";

/** Floating pill navbar for the landing page. */
export function FloatingNav() {
  return (
    <header className="fixed inset-x-0 top-4 z-40 flex justify-center px-4">
      <nav className="flex w-full max-w-xl items-center justify-between gap-3 rounded-full border border-border/80 bg-background/75 py-2 pl-4 pr-2 shadow-lg shadow-primary/10 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <LogoMark className="size-7" />
          NadPay
        </Link>
        <div className="hidden items-center gap-5 text-sm font-medium text-muted sm:flex">
          <a
            href="#how-it-works"
            className="hover:text-foreground transition-colors"
          >
            How it works
          </a>
          <a href="#safety" className="hover:text-foreground transition-colors">
            Safety
          </a>
        </div>
        <ConnectControl />
      </nav>
    </header>
  );
}
