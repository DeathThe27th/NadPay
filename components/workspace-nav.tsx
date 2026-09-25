"use client";

import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  Settings2,
  Users,
  WalletCards,
} from "lucide-react";

export type WorkspaceRole = "employer" | "employee" | "contractor";
export type WorkspaceView =
  | "overview"
  | "people"
  | "payroll"
  | "requests"
  | "reports"
  | "settings";

const EMPLOYER_NAV: Array<{ id: WorkspaceView; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "people", label: "People", icon: Users },
  { id: "payroll", label: "Payroll", icon: WalletCards },
  { id: "requests", label: "Requests", icon: ClipboardList },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings2 },
];

const MEMBER_NAV: Array<{ id: WorkspaceView; label: string; icon: typeof LayoutDashboard }> = [
  { id: "overview", label: "My payments", icon: WalletCards },
  { id: "requests", label: "Requests", icon: ClipboardList },
  { id: "settings", label: "Profile", icon: Settings2 },
];

export function WorkspaceNav({
  role,
  view,
  onRoleChange,
  onViewChange,
}: {
  role: WorkspaceRole;
  view: WorkspaceView;
  onRoleChange: (role: WorkspaceRole) => void;
  onViewChange: (view: WorkspaceView) => void;
}) {
  const items = role === "employer" ? EMPLOYER_NAV : MEMBER_NAV;

  return (
    <div className="workspace-nav-wrap">
      <div className="workspace-role-switch" aria-label="Workspace role">
        <span className="workspace-role-label">Workspace</span>
        {(["employer", "employee", "contractor"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={role === option}
            onClick={() => onRoleChange(option)}
            className={`workspace-role-button ${role === option ? "is-active" : ""}`}
          >
            {option[0].toUpperCase() + option.slice(1)}
          </button>
        ))}
      </div>
      <nav className="workspace-nav" aria-label={`${role} navigation`}>
        {items.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onViewChange(id)}
            aria-current={view === id ? "page" : undefined}
            className={`workspace-nav-link ${view === id ? "is-active" : ""}`}
          >
            <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
