# Nads2Pay payroll implementation note

## Baseline and decisions

- The existing NadPay public contract, mainnet address, old round ids and
  `/claim/{roundId}` and `/round/{roundId}` URLs remain unchanged.
- Public settlement stays MON-denominated. `claimAndSwap` remains the optional
  atomic USDC path on the existing mainnet deployment.
- Employer payroll funding continues to use `createRoundCustom` for reviewed
  drafts and only uses `setRecipients` when the payer deliberately saves an
  on-chain template.
- Application records are modeled offchain in
  `migrations/001_payroll_platform.sql`. The SQL is ready for PostgreSQL or
  Supabase but is not silently applied without credentials.
- Identity authorization is intentionally represented by stable internal user
  ids and memberships, not by email addresses, wallet addresses alone, or
  browser-submitted organization ids.

## Implemented in this slice

- Safe integer-base-unit MON parsing and claimable-balance rules.
- Explicit Monad gas-limit buffering, claim-event deduplication and payment
  statement CSV generation.
- Tenant-scoped authorization helpers and focused tests.
- Organization, membership, compensation, schedules, payroll runs, immutable
  allocations, requests, transaction attempts, index events, outbox and audit
  migration.
- Role-aware workspace navigation layered over the existing employer funding
  and legacy claim experience.
- `/api/health` capability diagnostics that disclose configuration status only,
  never credential values.
- `.env.example` with public/private boundaries.
- Supabase Auth email sign-in/sign-up with httpOnly access-token cookies and
  provider-verified subject mapping into `app_users`.
- Server-authorized organization creation, workspace membership reads and
  payroll-draft persistence. Draft recipients are checked against active
  memberships and verified payout wallets before any database write.
- EIP-191 payout-wallet challenge and signature verification, surfaced from
  the member Profile view.
- An Envio mainnet indexer scaffold for public NadPay events with transaction
  hash + log-index identities and no private organization fields.

## Provider-dependent work

Supabase credentials and migrations, Envio codegen/deployment, transactional
email, scheduled jobs, Unlink privacy settlement and fiat payout still require
provider configuration. Until configured, routes fail closed with an explicit
adapter or unavailable response; no demo balances are treated as real money.
Para SDK integration remains optional until its official packages and project
key are available; the existing injected-wallet path remains compatible.

## Reconciliation rules

Funding is not considered complete from a wallet callback alone. The backend
must reconcile chain id, contract address, payer, round id, expected total,
allocation snapshots, successful receipt and finality before creating a
payment-ready notification. A retry first searches the unique organization /
payroll-run submission record and reconciles an existing transaction.
