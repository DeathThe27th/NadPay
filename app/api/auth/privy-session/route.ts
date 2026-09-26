import { NextResponse } from "next/server";
import { importSPKI, jwtVerify } from "jose";
import { ACCESS_COOKIE } from "@/lib/server/identity";

export async function POST(request: Request) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const verificationKey = process.env.PRIVY_VERIFICATION_KEY;
  const { accessToken } = (await request.json()) as { accessToken?: string };
  if (!appId || !verificationKey || !accessToken) return NextResponse.json({ error: "Privy is not configured." }, { status: 503 });
  try {
    const key = await importSPKI(verificationKey.replace(/\\n/g, "\n"), "ES256");
    await jwtVerify(accessToken, key, { issuer: "privy.io", audience: appId });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(ACCESS_COOKIE, accessToken, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60, path: "/" });
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid Privy session." }, { status: 401 });
  }
}
