import { NextResponse } from "next/server";
import { ACCESS_COOKIE } from "@/lib/server/identity";
import { supabaseAuthRequest } from "@/lib/server/supabase";

type AuthResponse = {
  access_token?: string;
  user: { id: string; email?: string } | null;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string; name?: string };
    if (!body.email?.trim() || !body.password || body.password.length < 8) {
      return NextResponse.json({ error: "Use an email and a password with at least 8 characters." }, { status: 400 });
    }
    const result = await supabaseAuthRequest<AuthResponse>("signup", {
      method: "POST",
      body: JSON.stringify({
        email: body.email.trim(),
        password: body.password,
        data: body.name?.trim() ? { full_name: body.name.trim() } : undefined,
      }),
    });
    const response = NextResponse.json({ ok: true, user: result.user, needsEmailConfirmation: !result.access_token });
    if (result.access_token) {
      response.cookies.set(ACCESS_COOKIE, result.access_token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
    }
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create the account." },
      { status: 400 },
    );
  }
}
