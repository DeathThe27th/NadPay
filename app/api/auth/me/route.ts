import { NextResponse } from "next/server";
import { getVerifiedIdentity } from "@/lib/server/identity";

export async function GET(request: Request) {
  const identity = await getVerifiedIdentity(request);
  return NextResponse.json({
    authenticated: !!identity,
    user: identity
      ? { id: identity.subject, email: identity.email, displayName: identity.displayName, appUserId: identity.appUserId }
      : null,
  });
}
