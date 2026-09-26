"use client";

import { useEffect, useState } from "react";
import { Building2, BriefcaseBusiness, Check, Search, UsersRound } from "lucide-react";
import type { WorkspaceRole } from "@/components/workspace-nav";

type JoinRequest = {
  organization_id: string;
  status: string;
  organizations?: { id: string; name: string; slug: string } | null;
};

type OnboardingState = {
  role: WorkspaceRole | null;
  joinRequest: JoinRequest | null;
  hasWorkspace: boolean;
};

const ROLE_OPTIONS: Array<{
  id: WorkspaceRole;
  title: string;
  description: string;
  icon: typeof Building2;
}> = [
  { id: "employer", title: "I run a company", description: "Set up a company and run payroll for your team.", icon: Building2 },
  { id: "employee", title: "I work for a company", description: "Join your company and keep track of your payments.", icon: UsersRound },
  { id: "contractor", title: "I work independently", description: "Go straight to a simple workspace for contractor payments.", icon: BriefcaseBusiness },
];

export function OnboardingGate({ onComplete }: { onComplete: (role: WorkspaceRole) => void }) {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const response = await fetch("/api/onboarding", { cache: "no-store" });
      const body = (await response.json()) as OnboardingState & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Onboarding could not load.");
      setState(body);
      if (body.role === "contractor" || (body.role && body.hasWorkspace)) onComplete(body.role);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Onboarding could not load.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (loading || !state) {
    return <OnboardingFrame title="Preparing your workspace…"><p className="onboarding-muted">Checking your account setup.</p></OnboardingFrame>;
  }

  if (error) {
    return <OnboardingFrame title="We couldn’t load onboarding"><p className="workspace-inline-error" role="alert">{error}</p><button type="button" className="workspace-button primary" onClick={() => { setError(null); void refresh(); }}>Try again</button></OnboardingFrame>;
  }

  if (!state.role) {
    return <RoleStep onSelected={(role) => {
      if (role === "contractor") {
        onComplete(role);
      } else {
        setState((current) => current ? { ...current, role } : current);
      }
    }} />;
  }
  if (state.role === "employer" && !state.hasWorkspace) {
    return <EmployerStep onComplete={() => onComplete("employer")} />;
  }
  if (state.role === "employee" && !state.hasWorkspace && !state.joinRequest) {
    return <EmployeeStep onRequested={(joinRequest) => setState((current) => current ? { ...current, joinRequest } : current)} />;
  }
  if (state.role === "employee" && state.joinRequest) {
    return <PendingStep companyName={state.joinRequest.organizations?.name ?? "your company"} />;
  }

  return <OnboardingFrame title="Opening your workspace…"><p className="onboarding-muted">Your setup is complete.</p></OnboardingFrame>;
}

function OnboardingFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="onboarding-shell rise-in">
      <div className="onboarding-progress"><span className="is-current" /><span /><span /></div>
      <p className="onboarding-kicker">First-time setup</p>
      <h1>{title}</h1>
      {children}
    </div>
  );
}

function RoleStep({ onSelected }: { onSelected: (role: WorkspaceRole) => void }) {
  const [busy, setBusy] = useState<WorkspaceRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(role: WorkspaceRole) {
    setBusy(role);
    setError(null);
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const body = (await response.json()) as { role?: WorkspaceRole; error?: string };
      if (!response.ok || !body.role) throw new Error(body.error ?? "Your role could not be saved.");
      onSelected(body.role);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Your role could not be saved.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <OnboardingFrame title="What brings you to Nads2Pay?">
      <p className="onboarding-lede">Choose the workspace that fits you best. This choice is permanent for this account.</p>
      <div className="role-options">
        {ROLE_OPTIONS.map(({ id, title, description, icon: Icon }) => (
          <button type="button" key={id} className="role-option" onClick={() => void choose(id)} disabled={busy !== null}>
            <span className="role-option-icon"><Icon size={20} aria-hidden="true" /></span>
            <span><strong>{title}</strong><small>{description}</small></span>
            <span className="role-option-arrow">{busy === id ? "…" : "→"}</span>
          </button>
        ))}
      </div>
      {error && <p className="workspace-inline-error" role="alert">{error}</p>}
    </OnboardingFrame>
  );
}

function EmployerStep({ onComplete }: { onComplete: () => void }) {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, domain }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Company could not be created.");
      onComplete();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Company could not be created.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <OnboardingFrame title="Set up your company">
      <p className="onboarding-lede">Create the private workspace where you’ll manage people, payouts, and the money movement behind your work.</p>
      <form className="onboarding-form" onSubmit={submit}>
        <label className="settings-field"><span>Company name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Acme Inc." required minLength={2} maxLength={120} /></label>
        <label className="settings-field"><span>Company website or email domain <em>optional</em></span><input value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="acme.com" /></label>
        <button type="submit" className="workspace-button primary" disabled={busy || !name.trim()}>{busy ? "Creating workspace…" : "Create company workspace"}</button>
      </form>
      {error && <p className="workspace-inline-error" role="alert">{error}</p>}
    </OnboardingFrame>
  );
}

function EmployeeStep({ onRequested }: { onRequested: (request: JoinRequest) => void }) {
  const [search, setSearch] = useState("");
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; domain: string | null }>>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/organizations?search=${encodeURIComponent(search)}`, { cache: "no-store" });
        const body = (await response.json()) as { organizations?: Array<{ id: string; name: string; domain: string | null }>; error?: string };
        if (!response.ok) throw new Error(body.error ?? "Companies could not load.");
        setCompanies(body.organizations ?? []);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Companies could not load.");
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [search]);

  async function requestToJoin() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/organizations/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: selected }),
      });
      const body = (await response.json()) as { request?: JoinRequest; error?: string };
      if (!response.ok || !body.request) throw new Error(body.error ?? "Join request could not be created.");
      onRequested(body.request);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Join request could not be created.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <OnboardingFrame title="Which company do you work for?">
      <p className="onboarding-lede">Select your company. We’ll send a join request for an employer to approve.</p>
      <label className="onboarding-search"><Search size={17} aria-hidden="true" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search companies" aria-label="Search companies" /></label>
      <div className="company-options" aria-live="polite">
        {loading ? <p className="onboarding-muted">Searching…</p> : companies.map((company) => <button type="button" key={company.id} className={`company-option ${selected === company.id ? "is-selected" : ""}`} onClick={() => setSelected(company.id)}><span><strong>{company.name}</strong><small>{company.domain ?? "Company workspace"}</small></span>{selected === company.id && <Check size={18} aria-hidden="true" />}</button>)}
        {!loading && !companies.length && <p className="onboarding-muted">No company found yet. Ask your employer to create the workspace first.</p>}
      </div>
      <button type="button" className="workspace-button primary" onClick={() => void requestToJoin()} disabled={busy || !selected}>{busy ? "Sending request…" : "Request to join"}</button>
      {error && <p className="workspace-inline-error" role="alert">{error}</p>}
    </OnboardingFrame>
  );
}

function PendingStep({ companyName }: { companyName: string }) {
  return (
    <OnboardingFrame title="Your request is on its way">
      <p className="onboarding-lede">An employer at <strong>{companyName}</strong> needs to approve your membership before private payroll details become available.</p>
      <div className="pending-note"><Check size={18} aria-hidden="true" /><span>Request pending approval</span></div>
      <p className="onboarding-muted">You can connect a wallet later from Profile. It is not required for this step.</p>
    </OnboardingFrame>
  );
}
