import { NextResponse } from "next/server";
import { getVerifiedIdentity } from "@/lib/server/identity";
import { createJoinRequest, getOnboardingState } from "@/lib/server/onboarding";

export async function POST(request: Request) {
  const identity = await getVerifiedIdentity(request);
  if (!identity?.appUserId) return NextResponse.json({ error: "authentication-required" }, { status: 401 });
  try {
    const onboarding = await getOnboardingState(identity.appUserId);
    if (onboarding.role !== "employee") return NextResponse.json({ error: "Only an employee can request a company membership." }, { status: 403 });
    if (onboarding.hasWorkspace || onboarding.joinRequest) return NextResponse.json({ error: "Your company membership is already being handled." }, { status: 409 });
    const body = (await request.json()) as { organizationId?: string };
    if (!body.organizationId) return NextResponse.json({ error: "Choose a company first." }, { status: 400 });
    const requestRecord = await createJoinRequest({
      userId: identity.appUserId,
      organizationId: body.organizationId,
      requestedType: "employee",
    });
    return NextResponse.json({ request: requestRecord }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Join request could not be created." }, { status: 400 });
  }
}
