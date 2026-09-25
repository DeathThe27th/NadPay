import { supabaseAdminRequest } from "./supabase";
import { getUserMemberships } from "./payroll-db";

export type OnboardingRole = "employer" | "employee" | "contractor";

export type OnboardingOrganization = {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
};

export type JoinRequest = {
  id: string;
  organization_id: string;
  requested_type: "employee" | "contractor";
  status: "pending" | "accepted" | "rejected" | "cancelled";
  created_at: string;
  organizations?: { id: string; name: string; slug: string } | null;
};

export async function getOnboardingState(userId: string) {
  const users = await supabaseAdminRequest<Array<{ id: string; role: OnboardingRole | null }>>(
    `app_users?select=id,role&id=eq.${encodeURIComponent(userId)}&limit=1`,
  );
  const requests = await supabaseAdminRequest<JoinRequest[]>(
    `join_requests?select=id,organization_id,requested_type,status,created_at,organizations(id,name,slug)&user_id=eq.${encodeURIComponent(userId)}&status=eq.pending&order=created_at.desc&limit=1`,
  );
  const memberships = await getUserMemberships(userId);
  return {
    role: users[0]?.role ?? null,
    joinRequest: requests[0] ?? null,
    hasWorkspace: memberships.length > 0,
  };
}

export async function setOnboardingRole(userId: string, role: OnboardingRole) {
  const existing = await supabaseAdminRequest<Array<{ role: OnboardingRole | null }>>(
    `app_users?select=role&id=eq.${encodeURIComponent(userId)}&limit=1`,
  );
  if (!existing[0]) throw new Error("Account profile could not be found.");
  if (existing[0].role) throw new Error("Your role has already been selected.");

  const updated = await supabaseAdminRequest<Array<{ role: OnboardingRole }>>(
    `app_users?id=eq.${encodeURIComponent(userId)}&role=is.null`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ role }),
    },
  );
  if (!updated[0]) throw new Error("Your role could not be saved.");
  return updated[0].role;
}

export async function searchOrganizations(search: string) {
  const normalized = search.trim();
  const filter = normalized
    ? `&name=ilike.*${encodeURIComponent(normalized)}*`
    : "";
  return supabaseAdminRequest<OnboardingOrganization[]>(
    `organizations?select=id,name,slug,domain&order=name.asc&limit=30${filter}`,
  );
}

export async function createJoinRequest(input: {
  userId: string;
  organizationId: string;
  requestedType: "employee" | "contractor";
}) {
  const existing = await supabaseAdminRequest<JoinRequest[]>(
    `join_requests?select=id,organization_id,requested_type,status,created_at,organizations(id,name,slug)&user_id=eq.${encodeURIComponent(input.userId)}&organization_id=eq.${encodeURIComponent(input.organizationId)}&status=eq.pending&limit=1`,
  );
  if (existing[0]) return existing[0];

  const created = await supabaseAdminRequest<JoinRequest[]>("join_requests", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      organization_id: input.organizationId,
      user_id: input.userId,
      requested_type: input.requestedType,
      status: "pending",
    }),
  });
  if (!created[0]) throw new Error("Join request could not be created.");
  return created[0];
}
