"use client";

import { useEffect, useState } from "react";

type AuthUser = { email: string | null; displayName: string | null };

export function AuthControl() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    const body = (await response.json()) as { user?: AuthUser | null };
    setUser(body.user ?? null);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/auth/${mode === "sign-in" ? "sign-in" : "sign-up"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const body = (await response.json()) as { error?: string; needsEmailConfirmation?: boolean };
      if (!response.ok) throw new Error(body.error ?? "Authentication failed.");
      if (body.needsEmailConfirmation) {
        setMessage("Check your email to confirm the account, then sign in.");
        setMode("sign-in");
      } else {
        await refresh();
        setOpen(false);
        window.dispatchEvent(new Event("nadpay-auth-changed"));
      }
      setPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    setUser(null);
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
    <div className="auth-wrap">
      <button type="button" className="auth-control" onClick={() => setOpen((value) => !value)}>
        Sign in
      </button>
      {open && (
        <div className="auth-popover">
          <div className="auth-tabs">
            <button type="button" className={mode === "sign-in" ? "active" : ""} onClick={() => setMode("sign-in")}>Sign in</button>
            <button type="button" className={mode === "sign-up" ? "active" : ""} onClick={() => setMode("sign-up")}>Create account</button>
          </div>
          <form onSubmit={submit} className="auth-form">
            {mode === "sign-up" && <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name (optional)" autoComplete="name" />}
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" autoComplete="email" required />
            <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" autoComplete={mode === "sign-in" ? "current-password" : "new-password"} required minLength={8} />
            <button type="submit" className="workspace-button primary" disabled={busy}>{busy ? "Working…" : mode === "sign-in" ? "Sign in" : "Create account"}</button>
          </form>
          {message && <p className="auth-message" role="alert">{message}</p>}
          <p className="auth-footnote">Wallet connection still controls onchain signing and legacy claims.</p>
        </div>
      )}
    </div>
  );
}
