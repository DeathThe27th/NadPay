export type IntegrationStatus = "configured" | "adapter" | "unavailable";

export type PayrollIntegrationStatus = {
  auth: IntegrationStatus;
  database: IntegrationStatus;
  indexer: IntegrationStatus;
  email: IntegrationStatus;
  jobs: IntegrationStatus;
  privacy: IntegrationStatus;
  fiat: IntegrationStatus;
};

/** Server-safe capability summary. Never return credential values. */
export function getPayrollIntegrationStatus(
  env: NodeJS.ProcessEnv = process.env,
): PayrollIntegrationStatus {
  return {
    auth:
      env.NEXT_PUBLIC_PARA_API_KEY || (env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
        ? "configured"
        : "adapter",
    database:
      (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL) && env.SUPABASE_SERVICE_ROLE_KEY
        ? "configured"
        : "adapter",
    indexer: env.NEXT_PUBLIC_INDEXER_URL ? "configured" : "adapter",
    email: env.RESEND_API_KEY && env.EMAIL_FROM ? "configured" : "adapter",
    jobs: env.CRON_SECRET ? "configured" : "adapter",
    privacy: env.UNLINK_API_KEY ? "configured" : "unavailable",
    fiat: env.FIAT_PROVIDER && env.FIAT_PROVIDER_API_KEY ? "configured" : "unavailable",
  };
}
