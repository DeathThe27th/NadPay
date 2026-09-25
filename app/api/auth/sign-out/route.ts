import { NextResponse } from "next/server";
import { ACCESS_COOKIE } from "@/lib/server/identity";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ACCESS_COOKIE, "", { httpOnly: true, expires: new Date(0), path: "/" });
  return response;
}
