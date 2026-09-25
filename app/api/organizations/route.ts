import { NextResponse } from "next/server";
import { getVerifiedIdentity } from "@/lib/server/identity";
import { createOrganization } from "@/lib/server/payroll-db";
import { getOnboardingState, searchOrganizations } from "@/lib/server/onboarding";

export async function GET(request: Request) {
  const identity = await getVerifiedIdentity(request);
  if (!identity?.appUserId) return NextResponse.json({ error: "authentication-required" }, { status: 401 });
  try {
    const search = new URL(request.url).searchParams.get("search") ?? "";
    return NextResponse.json({ organizations: await searchOrganizations(search) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Companies could not be loaded." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const identity = await getVerifiedIdentity(request);
  if (!identity?.appUserId) return NextResponse.json({ error: "authentication-required" }, { status: 401 });
  try {
    const onboarding = await getOnboardingState(identity.appUserId);
    if (onboarding.role !== "employer") return NextResponse.json({ error: "Only an employer can create a company." }, { status: 403 });
    const body = (await request.json()) as { name?: string; domain?: string };
    const organization = await createOrganization({ userId: identity.appUserId, name: body.name ?? "", domain: body.domain });
    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Company could not be created." }, { status: 400 });
  }
}
