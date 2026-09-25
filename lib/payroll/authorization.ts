export type MembershipRole = "owner" | "employee" | "contractor";
export type MembershipStatus = "pending" | "active" | "rejected" | "removed";

export type MembershipAccess = {
  organizationId: string;
  userId: string;
  role: MembershipRole;
  status: MembershipStatus;
};

export function canReadOrganization(access: MembershipAccess | null): boolean {
  return access?.status === "active";
}

export function canManageOrganization(access: MembershipAccess | null): boolean {
  return access?.status === "active" && access.role === "owner";
}

export function canReadCompensation(
  access: MembershipAccess | null,
  targetUserId: string,
): boolean {
  if (!access || !canReadOrganization(access)) return false;
  return access.role === "owner" || access.userId === targetUserId;
}

export function canApproveJoinRequest(access: MembershipAccess | null): boolean {
  return canManageOrganization(access);
}

export function canSubmitContractorRequest(access: MembershipAccess | null): boolean {
  return access !== null && access.status === "active" && access.role === "contractor";
}

/** Never accept a browser-supplied organization id as authorization. */
export function assertOrganizationAccess(
  access: MembershipAccess | null,
  organizationId: string,
): void {
  if (!access || access.organizationId !== organizationId || !canReadOrganization(access)) {
    throw new Error("You do not have access to this organization.");
  }
}
