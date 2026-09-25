"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, LockKeyhole, Plus, ShieldCheck, WalletCards } from "lucide-react";
import { useSignMessage } from "wagmi";
import { formatMon } from "@/lib/format";
import type { PayerSummary } from "@/lib/rounds";
import type { WorkspaceRole, WorkspaceView } from "@/components/workspace-nav";

function PanelHeader({ title, description }: { title: string; description: string }) {
  return (
    <header className="workspace-panel-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </header>
  );
}

function IntegrationNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="integration-note">
      <LockKeyhole size={17} aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

type WorkspaceData = {
  user: { id: string; email: string | null; displayName: string | null };
  memberships: Array<{
    id: string;
    organization_id: string;
    membership_type: "owner" | "employee" | "contractor";
    organizations?: { id: string; name: string; slug: string } | null;
  }>;
};

function useWorkspaceData() {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const response = await fetch("/api/workspace", { cache: "no-store" });
      setData(response.ok ? ((await response.json()) as WorkspaceData) : null);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    const listener = () => void refresh();
    window.addEventListener("nadpay-auth-changed", listener);
    return () => window.removeEventListener("nadpay-auth-changed", listener);
  }, []);

  return { data, loading, refresh };
}

export function EmployerWorkspacePanel({
  view,
  summary,
  onOpenPayroll,
  onOpenSettings,
}: {
  view: WorkspaceView;
  summary: PayerSummary;
  onOpenPayroll: () => void;
  onOpenSettings: () => void;
}) {
  const workspace = useWorkspaceData();

  if (view === "payroll") return null;

  if (view === "people") {
    return (
      <section className="workspace-panel rise-in">
        <PanelHeader title="People" description="Approved members and their payout readiness." />
        <IntegrationNote>
          {workspace.data
            ? "Only active members with verified payout wallets can enter a funded run. Compensation and contact details stay in the private workspace."
            : "Sign in with a verified account to load the private company directory. Wallet connection alone never grants access to company data."}
        </IntegrationNote>
        {workspace.loading ? <div className="workspace-empty-state compact"><p>Loading private directory…</p></div> : workspace.data?.memberships.length ? (
          <div className="member-list">
            {workspace.data.memberships.map((membership) => (
              <div className="member-row" key={membership.id}>
                <div><strong>{membership.organizations?.name ?? "Company"}</strong><span>{membership.membership_type}</span></div>
                <small>Active membership</small>
              </div>
            ))}
          </div>
        ) : (
          <div className="workspace-empty-state">
            <div className="empty-icon"><ShieldCheck size={21} /></div>
            <h2>Your directory starts with a company.</h2>
            <p>Sign in, create the company record in Settings, then add only verified members to a payroll draft.</p>
            <button type="button" className="workspace-button secondary" onClick={onOpenSettings}>
              <Plus size={16} /> Create a company in Settings
            </button>
          </div>
        )}
      </section>
    );
  }

  if (view === "requests") {
    return (
      <section className="workspace-panel rise-in">
        <PanelHeader title="Requests" description="Join requests and one-off contractor payments." />
        <IntegrationNote>Requests are not stored in the browser. Configure the private database before accepting a join request or approving a contractor payment.</IntegrationNote>
        <div className="workspace-empty-state compact">
          <h2>No pending requests</h2>
          <p>Pending membership requests and contractor submissions will appear here after the workspace is connected.</p>
        </div>
      </section>
    );
  }

  if (view === "reports") {
    return (
      <section className="workspace-panel rise-in">
        <PanelHeader title="Reports" description="Separate funded, claimed, outstanding and reclaimed value." />
        <div className="report-grid">
          <div className="report-stat"><span>Claimed onchain</span><strong>{formatMon(summary.totalPaid)} MON</strong></div>
          <div className="report-stat"><span>Open allocations</span><strong>{formatMon(summary.lockedUnclaimed)} MON</strong></div>
          <div className="report-stat"><span>Rounds created</span><strong>{summary.roundsCreated}</strong></div>
          <div className="report-stat"><span>Pending claims</span><strong>{summary.pendingClaims}</strong></div>
        </div>
        <div className="workspace-empty-state compact">
          <h2>Export follows verified records.</h2>
          <p>CSV statements will include period, funding/claim dates and transaction references. MON-to-USD estimates will carry their valuation timestamp.</p>
        </div>
      </section>
    );
  }

  if (view === "settings") {
    return <EmployerSettings workspace={workspace} />;
  }

  return (
    <section className="workspace-panel rise-in">
      <PanelHeader title="Payroll overview" description="A calm place to see what needs attention before payday." />
      <div className="overview-grid">
        <div className="overview-feature">
          <span className="panel-kicker">Next payday</span>
          <strong>Schedule not set</strong>
          <p>Choose a frequency and timezone. Funding stays manual and always requires your wallet signature.</p>
          <button type="button" className="text-action" onClick={onOpenPayroll}>Open payroll editor <ArrowUpRight size={15} /></button>
        </div>
        <div className="overview-list">
          <div><span>Wallet</span><strong>Connected for signing</strong></div>
          <div><span>Claim-ready messages</span><strong>Outbox not configured</strong></div>
          <div><span>Private settlement</span><strong>Research adapter only</strong></div>
        </div>
      </div>
      <div className="workspace-section-label">Onchain activity</div>
      <div className="report-grid">
        <div className="report-stat"><span>Claimed</span><strong>{formatMon(summary.totalPaid)} MON</strong></div>
        <div className="report-stat"><span>Open</span><strong>{formatMon(summary.lockedUnclaimed)} MON</strong></div>
        <div className="report-stat"><span>Rounds</span><strong>{summary.roundsCreated}</strong></div>
        <div className="report-stat"><span>Claims waiting</span><strong>{summary.pendingClaims}</strong></div>
      </div>
    </section>
  );
}

function EmployerSettings({ workspace }: { workspace: ReturnType<typeof useWorkspaceData> }) {
  const [saved, setSaved] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyError, setCompanyError] = useState<string | null>(null);
  const [companyBusy, setCompanyBusy] = useState(false);

  async function createCompany(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCompanyBusy(true);
    setCompanyError(null);
    try {
      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: companyName }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Company could not be created.");
      setCompanyName("");
      await workspace.refresh();
    } catch (error) {
      setCompanyError(error instanceof Error ? error.message : "Company could not be created.");
    } finally {
      setCompanyBusy(false);
    }
  }

  return (
    <section className="workspace-panel rise-in">
      <PanelHeader title="Settings" description="Prepare the company rules without hiding what is still unconfigured." />
      <div className="settings-grid">
        <label className="settings-field"><span>Company name</span><input id="company-name" value={companyName} onChange={(event) => setCompanyName(event.target.value)} placeholder="Your company" /></label>
        <label className="settings-field"><span>Payroll frequency</span><select defaultValue="monthly"><option value="weekly">Weekly</option><option value="biweekly">Every two weeks</option><option value="monthly">Monthly</option></select></label>
        <label className="settings-field"><span>Timezone</span><select defaultValue="UTC"><option>UTC</option><option>Africa/Lagos</option><option>America/New_York</option><option>Europe/London</option></select></label>
      </div>
      <form onSubmit={createCompany}>
        <button type="submit" className="workspace-button primary" disabled={companyBusy || !companyName.trim()}>{companyBusy ? "Creating…" : "Create private company"}</button>
        {companyError && <p className="workspace-inline-error" role="alert">{companyError}</p>}
      </form>
      {workspace.data?.memberships.length ? <p className="workspace-footnote">{workspace.data.memberships.length} active company membership{workspace.data.memberships.length === 1 ? "" : "s"} loaded.</p> : null}
      <IntegrationNote>These controls are intentionally not presented as saved until a verified identity and private database are configured.</IntegrationNote>
      <IntegrationHealth />
      <button type="button" className="workspace-button primary" onClick={() => setSaved(true)}>
        {saved ? <><Check size={16} /> Draft noted locally</> : "Save as local draft"}
      </button>
    </section>
  );
}

function IntegrationHealth() {
  const [status, setStatus] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/health")
      .then((response) => response.json())
      .then((body: { integrations?: Record<string, string> }) => {
        if (active) setStatus(body.integrations ?? null);
      })
      .catch(() => {
        if (active) setStatus(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const labels = [
    ["auth", "Identity"],
    ["database", "Private data"],
    ["indexer", "Chain history"],
    ["email", "Email"],
    ["jobs", "Scheduled jobs"],
    ["privacy", "Private settlement"],
    ["fiat", "Fiat"],
  ] as const;

  return (
    <div className="integration-health" aria-live="polite">
      <div className="workspace-section-label">Integration readiness</div>
      <div className="integration-health-list">
        {labels.map(([key, label]) => (
          <div key={key}>
            <span>{label}</span>
            <strong className={`integration-status ${status?.[key] ?? "loading"}`}>
              {status?.[key] ?? "Checking…"}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MemberWorkspacePanel({ role, view, address }: { role: Exclude<WorkspaceRole, "employer">; view: WorkspaceView; address?: string }) {
  const [claimLink, setClaimLink] = useState("");
  const [claimLinkError, setClaimLinkError] = useState<string | null>(null);

  function openClaimLink() {
    setClaimLinkError(null);
    try {
      const parsed = new URL(claimLink, window.location.origin);
      if (parsed.origin !== window.location.origin || !/^\/claim\/\d+$/.test(parsed.pathname)) {
        throw new Error("Use a claim link from this NadPay workspace.");
      }
      window.location.assign(`${parsed.pathname}${parsed.search}`);
    } catch (error) {
      setClaimLinkError(error instanceof Error ? error.message : "Enter a valid claim link.");
    }
  }

  if (view === "requests") {
    return (
      <section className="workspace-panel rise-in">
        <PanelHeader title="Requests" description={role === "contractor" ? "Ask for a one-off payment with context attached." : "Track your membership requests."} />
        <IntegrationNote>Requests require verified sign-in and a private company membership. No salary or request data is created from this browser-only preview.</IntegrationNote>
        <div className="workspace-empty-state compact"><h2>Nothing to review yet</h2><p>Your approved requests and their funding status will appear here.</p></div>
      </section>
    );
  }

  if (view === "settings") {
    return <MemberSettings address={address} />;
  }

  return (
    <section className="workspace-panel rise-in">
      <PanelHeader title="My payments" description="Claim links remain wallet-controlled. Sign-in never replaces wallet authorization." />
      <div className="member-hero">
        <div className="empty-icon"><WalletCards size={21} /></div>
        <div><h2>No linked payments yet.</h2><p>When your employer funds a round, open the existing claim link to see the allocation, deadline and MON or atomic USDC options.</p></div>
      </div>
      <div className="claim-link-row"><input aria-label="Claim link" value={claimLink} onChange={(event) => setClaimLink(event.target.value)} placeholder="Paste a /claim/7 link" /><button type="button" className="workspace-button secondary" onClick={openClaimLink} disabled={!claimLink.trim()}>Open claim</button></div>
      {claimLinkError && <p className="workspace-inline-error" role="alert">{claimLinkError}</p>}
      <p className="workspace-footnote">Legacy claim URLs remain available without an account. The funded wallet controls the claim.</p>
    </section>
  );
}

function MemberSettings({ address }: { address?: string }) {
  const { signMessageAsync } = useSignMessage();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function verifyWallet() {
    if (!address) return;
    setBusy(true);
    setMessage(null);
    try {
      const challengeResponse = await fetch("/api/wallets/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const challenge = (await challengeResponse.json()) as { message?: string; error?: string };
      if (!challengeResponse.ok || !challenge.message) throw new Error(challenge.error ?? "Could not create wallet challenge.");
      const signature = await signMessageAsync({ message: challenge.message });
      const verifyResponse = await fetch("/api/wallets/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, message: challenge.message, signature }),
      });
      const result = (await verifyResponse.json()) as { error?: string };
      if (!verifyResponse.ok) throw new Error(result.error ?? "Wallet verification failed.");
      setMessage("Wallet verified. An employer can now include it in a future payroll run.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Wallet verification failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="workspace-panel rise-in">
      <PanelHeader title="Profile" description="Your identity and payout wallet stay separate from public claim links." />
      <div className="profile-wallet"><span>Connected wallet</span><strong>{address ?? "Not connected"}</strong><small>Wallet ownership must be verified before an employer can include it in a new funded run.</small></div>
      <button type="button" className="workspace-button primary" onClick={verifyWallet} disabled={busy || !address}>{busy ? "Waiting for signature…" : "Verify payout wallet"}</button>
      {message && <p className="workspace-footnote" role="status">{message}</p>}
      <IntegrationNote>Changing a payout wallet requires ownership proof and employer confirmation. Existing funded allocations remain tied to their original wallet.</IntegrationNote>
    </section>
  );
}
