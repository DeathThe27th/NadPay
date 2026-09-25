import { NextResponse } from "next/server";
import { getVerifiedIdentity } from "@/lib/server/identity";
import {
  getOnboardingState,
  setOnboardingRole,
  type OnboardingRole,
} from "@/lib/server/onboarding";

const ROLES = new Set<OnboardingRole>(["employer", "employee", "contractor"]);

export async function GET(request: Request) {
  const identity = await getVerifiedIdentity(request);
  if (!identity?.appUserId) {
    return NextResponse.json({ error: "authentication-required" }, { status: 401 });
  }
  try {
    return NextResponse.json(await getOnboardingState(identity.appUserId));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Onboarding is unavailable." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const identity = await getVerifiedIdentity(request);
  if (!identity?.appUserId) {
    return NextResponse.json({ error: "authentication-required" }, { status: 401 });
  }
  try {
    const body = (await request.json()) as { role?: string };
    if (!body.role || !ROLES.has(body.role as OnboardingRole)) {
      return NextResponse.json({ error: "Choose employer, employee, or contractor." }, { status: 400 });
    }
    const role = await setOnboardingRole(identity.appUserId, body.role as OnboardingRole);
    return NextResponse.json({ role });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Your role could not be saved." },
      { status: 409 },
    );
  }
}
