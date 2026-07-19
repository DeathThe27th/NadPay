"use client";

import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { ConnectControl } from "@/components/shell";

/** Floating pill navbar for the landing page. */
export function FloatingNav() {
  return (
    <header className="fixed inset-x-0 top-4 z-40 flex justify-center px-4">
      <nav className="flex items-center gap-6 rounded-full border border-border/80 bg-background/75 py-2 pl-3 pr-2 shadow-lg shadow-primary/10 backdrop-blur-md">
        <Link href="/" aria-label="NadPay home" className="flex items-center">
          <LogoMark className="size-8" />
        </Link>
        <ConnectControl />
      </nav>
    </header>
  );
}
