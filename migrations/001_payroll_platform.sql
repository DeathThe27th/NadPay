-- Nads2Pay payroll platform foundation.
-- Application data is private/offchain. Public settlement remains in the
-- existing NadPay contract and is referenced by chain + contract + round.

create extension if not exists pgcrypto;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  identity_provider text not null,
  identity_subject text not null,
  email text,
  email_verified_at timestamptz,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (identity_provider, identity_subject)
);

create table if not exists verified_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  chain_id bigint not null,
  wallet_address text not null,
  ownership_verified_at timestamptz not null,
  verification_method text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (chain_id, wallet_address),
  unique (user_id, chain_id, wallet_address)
);

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  domain text,
  funding_chain_id bigint not null default 143,
  funding_wallet_id uuid references verified_wallets(id),
  created_by uuid not null references app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  membership_type text not null check (membership_type in ('owner', 'employee', 'contractor')),
  status text not null default 'active' check (status in ('pending', 'active', 'rejected', 'removed')),
  payout_wallet_id uuid references verified_wallets(id),
  joined_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists join_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  requested_type text not null check (requested_type in ('employee', 'contractor')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  message text,
  decided_by uuid references app_users(id),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id, status)
);

create table if not exists compensation_revisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  membership_id uuid not null references memberships(id) on delete cascade,
  token text not null default 'MON',
  amount_base_units numeric(78, 0) not null check (amount_base_units > 0),
  effective_from date not null,
  effective_to date,
  created_by uuid not null references app_users(id),
  created_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from)
);

create table if not exists payroll_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  frequency text not null check (frequency in ('weekly', 'biweekly', 'monthly')), 
  day_of_month smallint,
  weekday smallint,
  timezone text not null,
  next_due_date date not null,
  default_token text not null default 'MON',
  active boolean not null default true,
  created_by uuid not null references app_users(id),
  created_at timestamptz not null default now(),
  check (day_of_month is null or day_of_month between 1 and 31),
  check (weekday is null or weekday between 0 and 6)
);

create table if not exists payroll_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  schedule_id uuid references payroll_schedules(id),
  period_start date not null,
  period_end date not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'submitted', 'pending', 'funded', 'failed', 'cancelled')),
  claim_window_seconds bigint not null default 604800,
  chain_id bigint,
  contract_address text,
  round_id numeric(78, 0),
  submission_intent_id uuid,
  funded_at timestamptz,
  created_by uuid not null references app_users(id),
  created_at timestamptz not null default now(),
  unique (organization_id, schedule_id, period_start, period_end)
);

create table if not exists funded_allocations (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references payroll_runs(id) on delete cascade,
  membership_id uuid references memberships(id),
  wallet_address text not null,
  token text not null default 'MON',
  amount_base_units numeric(78, 0) not null check (amount_base_units > 0),
  request_id uuid,
  snapshot_at timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_token text,
  claimed_amount_base_units numeric(78, 0),
  claim_tx_hash text,
  unique (payroll_run_id, wallet_address)
);

create table if not exists payment_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  membership_id uuid not null references memberships(id) on delete cascade,
  token text not null default 'MON',
  amount_base_units numeric(78, 0) not null check (amount_base_units > 0),
  reason text not null,
  status text not null default 'submitted' check (status in ('submitted', 'approved-unfunded', 'rejected', 'included-in-draft', 'funded', 'claimed', 'expired', 'reclaimed')),
  approved_by uuid references app_users(id),
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists transaction_attempts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  payroll_run_id uuid references payroll_runs(id),
  chain_id bigint not null,
  contract_address text not null,
  tx_hash text,
  status text not null default 'intent' check (status in ('intent', 'submitted', 'confirmed', 'failed', 'reconciled')),
  expected_total_base_units numeric(78, 0) not null,
  receipt_block bigint,
  error_code text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (organization_id, payroll_run_id)
);

create table if not exists indexed_chain_events (
  chain_id bigint not null,
  contract_address text not null,
  tx_hash text not null,
  log_index integer not null,
  block_number bigint not null,
  event_name text not null,
  round_id numeric(78, 0),
  payload jsonb not null default '{}'::jsonb,
  indexed_at timestamptz not null default now(),
  primary key (chain_id, tx_hash, log_index)
);

create table if not exists notification_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references app_users(id),
  organization_id uuid references organizations(id),
  kind text not null,
  dedupe_key text not null unique,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create table if not exists audit_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_user_id uuid references app_users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists memberships_org_status_idx on memberships (organization_id, status);
create index if not exists allocations_membership_idx on funded_allocations (membership_id, snapshot_at desc);
create index if not exists payroll_runs_org_period_idx on payroll_runs (organization_id, period_end desc);
create index if not exists indexed_events_round_idx on indexed_chain_events (chain_id, contract_address, round_id);
create index if not exists outbox_due_idx on notification_outbox (status, next_attempt_at);
create index if not exists audit_org_created_idx on audit_entries (organization_id, created_at desc);

-- Enable RLS before exposing any tables through a client-facing database API.
-- Policies should be created by the selected auth adapter after its verified
-- subject-to-app_user mapping is configured. Service-role jobs bypass RLS.
alter table app_users enable row level security;
alter table verified_wallets enable row level security;
alter table organizations enable row level security;
alter table memberships enable row level security;
alter table join_requests enable row level security;
alter table compensation_revisions enable row level security;
alter table payroll_schedules enable row level security;
alter table payroll_runs enable row level security;
alter table funded_allocations enable row level security;
alter table payment_requests enable row level security;
alter table transaction_attempts enable row level security;
alter table indexed_chain_events enable row level security;
alter table notification_outbox enable row level security;
alter table audit_entries enable row level security;
