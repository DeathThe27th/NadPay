import { NextResponse } from "next/server";
import { getVerifiedIdentity } from "@/lib/server/identity";
import { createOrganization } from "@/lib/server/payroll-db";

export async function POST(request: Request) {
  const identity = await getVerifiedIdentity(request);
  if (!identity?.appUserId) return NextResponse.json({ error: "authentication-required" }, { status: 401 });
  try {
    const body = (await request.json()) as { name?: string; domain?: string };
    const organization = await createOrganization({ userId: identity.appUserId, name: body.name ?? "", domain: body.domain });
    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Company could not be created." }, { status: 400 });
  }
}
