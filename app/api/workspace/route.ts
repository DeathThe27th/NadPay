import { NextResponse } from "next/server";
import { getVerifiedIdentity } from "@/lib/server/identity";
import { getUserMemberships } from "@/lib/server/payroll-db";

export async function GET(request: Request) {
  const identity = await getVerifiedIdentity(request);
  if (!identity?.appUserId) return NextResponse.json({ error: "authentication-required" }, { status: 401 });
  const memberships = await getUserMemberships(identity.appUserId);
  return NextResponse.json({
    user: { id: identity.appUserId, email: identity.email, displayName: identity.displayName },
    memberships,
  });
}
