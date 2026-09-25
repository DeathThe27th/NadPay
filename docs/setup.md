# Nads2Pay setup and deployment

## Local checks

```bash
npm install
npm test
npx tsc --noEmit
npm run dev
```

Use `.env.example` as the starting point for a local `.env.local`. The
existing public contract defaults to Monad mainnet; set
`NEXT_PUBLIC_NETWORK=testnet` for a safe wallet demo.

## Private application setup

1. Create the selected auth project and configure production/preview origins.
2. Configure the verified identity adapter and set the server-only auth secret.
3. Apply `migrations/001_payroll_platform.sql`, then
   `migrations/002_rls_policies.sql` to the private Postgres/Supabase project.
4. Confirm that the internal `app_users.identity_subject` is populated only
   from a provider-verified subject. Never accept an identity header from the
   browser.
5. Run the app and check `/api/health`; it reports capability labels only and
   never returns credential values.

## Indexing

Verify the selected contract address, ABI and deployment block on the Monad
explorer before creating the HyperIndex project. The exact pinned preparation
command is in `indexer/README.md`. Keep organization metadata out of the
public indexer.

The repository now contains an initialized Envio project under `indexer/`.
Replace its visible `start_block: 0` placeholder with the verified NadPay
deployment block, run `pnpm codegen`, then connect the deployed GraphQL URL as
`NEXT_PUBLIC_INDEXER_URL`. Envio CLI login and cloud deployment are intentionally
left to the account owner.

## Email and jobs

Set `RESEND_API_KEY`, `EMAIL_FROM`, and `CRON_SECRET` in the hosting secret
manager. Invoke `POST /api/jobs/outbox` with `Authorization: Bearer <cron
secret>` from a durable scheduler. The worker claims pending rows
optimistically, sends through Resend, records delivery status, and retries with
bounded exponential backoff. It never sends a payment-ready email before the
funding reconciliation code has marked the run confirmed.

## Production guardrails

- Do not put service-role, database, email, scheduler or privacy secrets in
  `NEXT_PUBLIC_*` variables.
- Do not deploy or change the existing public contracts as part of this app
  setup.
- Use an employer wallet for payroll signing; backend jobs must not hold a
  payroll spending key.
