import { cookies } from "next/headers";
import { supabaseAdminRequest, supabaseAuthRequest } from "./supabase";
import { importSPKI, jwtVerify } from "jose";

async function verifyPrivyToken(token: string, appId: string, verificationKey: string) {
  const key = await importSPKI(verificationKey.replace(/\\n/g, "\n"), "ES256");
  const result = await jwtVerify(token, key, { issuer: "privy.io", audience: appId });
  return { user_id: String(result.payload.sub) };
}

export const ACCESS_COOKIE = "nadpay_access_token";

type SupabaseUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  user_metadata?: { full_name?: string; name?: string };
};

export type VerifiedIdentity = {
  provider: "supabase" | "privy";
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

async function ensureAppUser(user: { id: string; email?: string | null; displayName?: string | null; verified?: string | null }, provider: VerifiedIdentity["provider"]): Promise<AppUserRow | null> {
  try {
    const existing = await supabaseAdminRequest<AppUserRow[]>(
      `app_users?select=id,email,display_name&identity_provider=eq.${provider}&identity_subject=eq.${encodeURIComponent(user.id)}&limit=1`,
    );
    if (existing[0]) return existing[0];

    const created = await supabaseAdminRequest<AppUserRow[]>("app_users", {
      method: "POST",
      headers: { Prefer: "return=representation,resolution=merge-duplicates" },
      body: JSON.stringify({
        identity_provider: provider,
        identity_subject: user.id,
        email: user.email ?? null,
        display_name: user.displayName ?? user.email?.split("@")[0] ?? null,
        email_verified_at: user.verified ?? null,
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

  if (process.env.NEXT_PUBLIC_PRIVY_APP_ID && process.env.PRIVY_VERIFICATION_KEY) {
    try {
      const verified = await verifyPrivyToken(token, process.env.NEXT_PUBLIC_PRIVY_APP_ID, process.env.PRIVY_VERIFICATION_KEY);
      const appUser = await ensureAppUser({ id: verified.user_id }, "privy");
      return { provider: "privy", subject: verified.user_id, email: null, displayName: null, accessToken: token, appUserId: appUser?.id ?? null };
    } catch {
      // Preserve the legacy Supabase path while deployments migrate to Privy.
    }
  }

  let user: SupabaseUser;
  try {
    user = await supabaseAuthRequest<SupabaseUser>("user", {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return null;
  }

  const appUser = await ensureAppUser({ id: user.id, email: user.email, displayName: user.user_metadata?.full_name ?? user.user_metadata?.name, verified: user.email_confirmed_at ?? user.confirmed_at }, "supabase");
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
