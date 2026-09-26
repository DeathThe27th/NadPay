"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

export default function SignInPage() {
  const router = useRouter();
  const { login, ready, authenticated } = usePrivy();

  useEffect(() => {
    if (authenticated) router.replace("/");
    else if (ready) login();
  }, [authenticated, ready, login, router]);

  return (
    <main className="auth-page auth-page-redirect">
      <p className="onboarding-kicker">Nads2Pay workspace</p>
      <h1>Opening your secure workspace…</h1>
      <p className="auth-page-lede">Sign in with Privy to continue to your payroll setup.</p>
    </main>
  );
}
