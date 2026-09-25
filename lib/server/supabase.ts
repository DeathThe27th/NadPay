export type SupabaseAdminConfig = {
  url: string;
  serviceRoleKey: string;
};

export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
};

export function getSupabasePublicConfig(
  env: NodeJS.ProcessEnv = process.env,
): SupabasePublicConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/$/, ""), anonKey };
}

export function getSupabaseAdminConfig(env: NodeJS.ProcessEnv = process.env): SupabaseAdminConfig | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  return { url: env.SUPABASE_URL.replace(/\/$/, ""), serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY };
}

/** Minimal server-only REST client; service-role credentials never enter the browser. */
export async function supabaseAdminRequest<T>(
  path: string,
  init: RequestInit = {},
  env: NodeJS.ProcessEnv = process.env,
): Promise<T> {
  const config = getSupabaseAdminConfig(env);
  if (!config) throw new Error("Supabase server configuration is missing.");
  const response = await fetch(`${config.url}/rest/v1/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Database request failed with ${response.status}.`);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/**
 * Call Supabase Auth without shipping a service-role key to the browser.
 * Keeping this small avoids a second client library and works in Route
 * Handlers as well as background jobs.
 */
export async function supabaseAuthRequest<T>(
  path: string,
  init: RequestInit = {},
  env: NodeJS.ProcessEnv = process.env,
): Promise<T> {
  const config = getSupabasePublicConfig(env);
  if (!config) throw new Error("Supabase Auth configuration is missing.");
  const response = await fetch(`${config.url}/auth/v1/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      apikey: config.anonKey,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { msg?: string; error_description?: string } | null;
    throw new Error(body?.msg ?? body?.error_description ?? "Supabase Auth request failed.");
  }
  return (await response.json()) as T;
}

export function isSupabaseConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return getSupabasePublicConfig(env) !== null;
}
