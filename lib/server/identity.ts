import { cookies } from "next/headers";
import { supabaseAdminRequest, supabaseAuthRequest } from "./supabase";

export const ACCESS_COOKIE = "nadpay_access_token";

type SupabaseUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  user_metadata?: { full_name?: string; name?: string };
};

export type VerifiedIdentity = {
  provider: "supabase";
  subject: string;
  email: string | null;
  displayName: string | null;
  accessToken: string;
  appUserId: string | null;
};

type AppUserRow = { id: string; email: string | null; display_name: string | null };

function bearerToken(request: Request, cookieValue: string | undefined): string | null {
  const header = request.headers.get("authorization");
  if (header?.match(/^Bearer\s+/i)) return header.replace(/^Bearer\s+/i, "").trim();
  return cookieValue ?? null;
}

async function ensureAppUser(user: SupabaseUser): Promise<AppUserRow | null> {
  try {
    const existing = await supabaseAdminRequest<AppUserRow[]>(
      `app_users?select=id,email,display_name&identity_provider=eq.supabase&identity_subject=eq.${encodeURIComponent(user.id)}&limit=1`,
    );
    if (existing[0]) return existing[0];

    const displayName =
      user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split("@")[0] ?? null;
    const created = await supabaseAdminRequest<AppUserRow[]>("app_users", {
      method: "POST",
      headers: { Prefer: "return=representation,resolution=merge-duplicates" },
      body: JSON.stringify({
        identity_provider: "supabase",
        identity_subject: user.id,
        email: user.email ?? null,
        display_name: displayName,
        email_verified_at:
          user.email_confirmed_at ?? user.confirmed_at ?? null,
      }),
    });
    return created[0] ?? null;
  } catch {
    // Auth remains usable when the private database is not configured. Any
    // database-backed payroll mutation still fails closed at its boundary.
    return null;
  }
}

export async function getVerifiedIdentity(request: Request): Promise<VerifiedIdentity | null> {
  const cookieStore = await cookies();
  const token = bearerToken(request, cookieStore.get(ACCESS_COOKIE)?.value);
  if (!token) return null;

  let user: SupabaseUser;
  try {
    user = await supabaseAuthRequest<SupabaseUser>("user", {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return null;
  }

  const appUser = await ensureAppUser(user);
  return {
    provider: "supabase",
    subject: user.id,
    email: user.email ?? null,
    displayName:
      user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split("@")[0] ?? null,
    accessToken: token,
    appUserId: appUser?.id ?? null,
  };
}
