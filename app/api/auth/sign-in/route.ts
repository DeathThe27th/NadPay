import { NextResponse } from "next/server";
import { ACCESS_COOKIE } from "@/lib/server/identity";
import { supabaseAuthRequest } from "@/lib/server/supabase";

type AuthResponse = { access_token: string; refresh_token: string; user: { id: string; email?: string } };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    if (!body.email?.trim() || !body.password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }
    const session = await supabaseAuthRequest<AuthResponse>("token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email: body.email.trim(), password: body.password }),
    });
    const response = NextResponse.json({ ok: true, user: session.user });
    response.cookies.set(ACCESS_COOKIE, session.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to sign in." },
      { status: 401 },
    );
  }
}
