"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";

export type AuthUser = {
  id?: string;
  email: string | null;
  displayName: string | null;
  appUserId?: string | null;
};

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function useAuthUser() {
  const { authenticated, ready, user: privyUser, getAccessToken } = usePrivy();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const accessToken = await getAccessToken();
      if (accessToken) {
        const sessionResponse = await fetch("/api/auth/privy-session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ accessToken }) });
        if (!sessionResponse.ok) throw new Error("Privy session could not be established.");
      }
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const body = await readJson<{ user?: AuthUser | null }>(response);
      if (!response.ok || !body) throw new Error("Account details could not be loaded.");
      setUser(authenticated ? { ...body.user, id: privyUser?.id, email: privyUser?.email?.address ?? null, displayName: privyUser?.google?.name ?? privyUser?.email?.address?.split("@")[0] ?? null } : null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!ready) return;
    void refresh();
    const listener = () => void refresh();
    window.addEventListener("nadpay-auth-changed", listener);
    return () => window.removeEventListener("nadpay-auth-changed", listener);
  }, [ready, authenticated, privyUser?.id]);

  return { user, loading, refresh };
}

export function AuthForm() {
  const { login, ready, authenticated } = usePrivy();

  return (
    <div className="auth-page-card">
      <p className="auth-card-title">Your identity, your wallet, your workspace.</p>
      <button type="button" className="workspace-button primary auth-launch" onClick={() => login()} disabled={!ready || authenticated}>
        {authenticated ? "Signed in" : "Continue with Privy"}
      </button>
      <p className="auth-footnote">Use email, Google, or an existing wallet. Privy keeps sign-in and wallet setup in one flow.</p>
    </div>
  );
}

export function AuthControl() {
  const { user } = useAuthUser();
  const { logout } = usePrivy();

  async function signOut() {
    await logout();
    await fetch("/api/auth/sign-out", { method: "POST" });
    window.dispatchEvent(new Event("nadpay-auth-changed"));
  }

  if (user) {
    return (
      <button type="button" onClick={signOut} className="auth-control" title="Sign out">
        <span className="auth-dot" />
        <span>{user.displayName || user.email || "Signed in"}</span>
      </button>
    );
  }

  return (
    <Link href="/sign-in" className="auth-control">Sign in</Link>
  );
}
