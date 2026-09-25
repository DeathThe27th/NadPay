import { activeChain } from "@/lib/wagmi";
import { supabaseAdminRequest } from "./supabase";

export type WorkspaceMembership = {
  id: string;
  organization_id: string;
  membership_type: "owner" | "employee" | "contractor";
  status: string;
  payout_wallet_id: string | null;
  organizations?: { id: string; name: string; slug: string } | null;
};

export type WorkspaceOrganization = {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  funding_chain_id: number;
};

function slugify(value: string): string {
  const slug = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug.slice(0, 48) || "company";
}

export async function getUserMemberships(userId: string): Promise<WorkspaceMembership[]> {
  return supabaseAdminRequest<WorkspaceMembership[]>(
    `memberships?select=id,organization_id,membership_type,status,payout_wallet_id,organizations(id,name,slug)&user_id=eq.${encodeURIComponent(userId)}&status=eq.active&order=created_at.asc`,
  );
}

export async function getOwnerMembership(userId: string, organizationId: string): Promise<WorkspaceMembership | null> {
  const rows = await supabaseAdminRequest<WorkspaceMembership[]>(
    `memberships?select=id,organization_id,membership_type,status,payout_wallet_id&user_id=eq.${encodeURIComponent(userId)}&organization_id=eq.${encodeURIComponent(organizationId)}&membership_type=eq.owner&status=eq.active&limit=1`,
  );
  return rows[0] ?? null;
}

export async function createOrganization(input: { userId: string; name: string; domain?: string | null }) {
  const name = input.name.trim();
  if (name.length < 2 || name.length > 120) throw new Error("Company name must be between 2 and 120 characters.");
  const baseSlug = slugify(name);
  const suffix = crypto.randomUUID().slice(0, 8);
  const created = await supabaseAdminRequest<WorkspaceOrganization[]>("organizations", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      name,
      slug: `${baseSlug}-${suffix}`,
      domain: input.domain?.trim() || null,
      funding_chain_id: activeChain.id,
      created_by: input.userId,
    }),
  });
  const organization = created[0];
  if (!organization) throw new Error("Company could not be created.");
  await supabaseAdminRequest("memberships", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      organization_id: organization.id,
      user_id: input.userId,
      membership_type: "owner",
      status: "active",
      joined_at: new Date().toISOString(),
    }),
  });
  return organization;
}

export async function assertOwnerAllocations(
  userId: string,
  organizationId: string,
  allocations: readonly { membershipId: string; walletAddress: string }[],
) {
  const owner = await getOwnerMembership(userId, organizationId);
  if (!owner) throw new Error("Only an active company owner can prepare payroll.");

  const result: Array<{ membershipId: string; walletAddress: string }> = [];
  for (const allocation of allocations) {
    const memberships = await supabaseAdminRequest<Array<{ id: string; user_id: string; payout_wallet_id: string | null }>>(
      `memberships?select=id,user_id,payout_wallet_id&organization_id=eq.${encodeURIComponent(organizationId)}&id=eq.${encodeURIComponent(allocation.membershipId)}&status=eq.active&membership_type=in.(employee,contractor)&limit=1`,
    );
    const membership = memberships[0];
    if (!membership || !membership.payout_wallet_id) {
      throw new Error("Every payroll recipient must be an active member with a verified payout wallet.");
    }
    const wallets = await supabaseAdminRequest<Array<{ wallet_address: string }>>(
      `verified_wallets?select=wallet_address&id=eq.${encodeURIComponent(membership.payout_wallet_id)}&user_id=eq.${encodeURIComponent(membership.user_id)}&chain_id=eq.${activeChain.id}&limit=1`,
    );
    if (wallets[0]?.wallet_address.toLowerCase() !== allocation.walletAddress.toLowerCase()) {
      throw new Error("Payroll wallets must match the member's verified wallet.");
    }
    result.push({ membershipId: membership.id, walletAddress: wallets[0].wallet_address });
  }
  return result;
}
