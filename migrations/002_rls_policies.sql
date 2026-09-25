-- Supabase RLS policies for the payroll schema.
-- The helper maps the verified Supabase auth subject to the internal app user.
-- Service-role workers bypass these policies.

create or replace function public.app_current_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.app_users
  where identity_provider = 'supabase'
    and identity_subject = auth.uid()::text
  limit 1
$$;

create or replace function public.app_is_org_owner(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where organization_id = target_org
      and user_id = public.app_current_user_id()
      and membership_type = 'owner'
      and status = 'active'
  )
$$;

create or replace function public.app_is_active_member(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships
    where organization_id = target_org
      and user_id = public.app_current_user_id()
      and status = 'active'
  )
$$;

create policy app_users_self on app_users
  for select using (id = app_current_user_id());
-- Identity and wallet writes stay in the verified server adapter. A client
-- must not be able to self-assert an email, wallet or verification timestamp.

create policy wallets_self_read on verified_wallets
  for select using (user_id = app_current_user_id());

create policy organizations_members on organizations
  for select using (app_is_active_member(id));
create policy organizations_create on organizations
  for insert with check (created_by = app_current_user_id());
create policy memberships_visible_to_member_or_owner on memberships
  for select using (user_id = app_current_user_id() or app_is_org_owner(organization_id));
create policy memberships_bootstrap_owner on memberships
  for insert with check (
    user_id = app_current_user_id()
    and membership_type = 'owner'
    and status = 'active'
    and exists (select 1 from organizations o where o.id = organization_id and o.created_by = app_current_user_id())
  );

create policy join_requests_requester_or_owner on join_requests
  for select using (user_id = app_current_user_id() or app_is_org_owner(organization_id));
create policy join_requests_requester_create on join_requests
  for insert with check (user_id = app_current_user_id());
create policy join_requests_owner_decide on join_requests
  for update using (app_is_org_owner(organization_id)) with check (app_is_org_owner(organization_id));

create policy compensation_owner_or_subject on compensation_revisions
  for select using (
    app_is_org_owner(organization_id)
    or exists (
      select 1 from memberships m
      where m.id = membership_id and m.user_id = app_current_user_id() and m.status = 'active'
    )
  );
create policy schedules_owner_read on payroll_schedules
  for select using (app_is_org_owner(organization_id));
create policy runs_owner_read on payroll_runs
  for select using (app_is_org_owner(organization_id));

create policy allocations_owner_or_subject on funded_allocations
  for select using (
    exists (select 1 from payroll_runs r where r.id = payroll_run_id and app_is_org_owner(r.organization_id))
    or exists (
      select 1 from memberships m
      where m.id = membership_id and m.user_id = app_current_user_id() and m.status = 'active'
    )
  );
create policy requests_member_or_owner on payment_requests
  for select using (membership_id in (select id from memberships where user_id = app_current_user_id()) or app_is_org_owner(organization_id));
create policy requests_contractor_create on payment_requests
  for insert with check (
    membership_id in (select id from memberships where user_id = app_current_user_id() and membership_type = 'contractor' and status = 'active')
  );
create policy requests_owner_decide on payment_requests
  for update using (app_is_org_owner(organization_id)) with check (app_is_org_owner(organization_id));

create policy audit_owner_read on audit_entries
  for select using (app_is_org_owner(organization_id));

-- These tables are backend-only. Do not expose them through the anon client.
create policy transaction_attempts_owner_read on transaction_attempts
  for select using (app_is_org_owner(organization_id));
create policy indexed_events_no_client_read on indexed_chain_events
  for select using (false);
create policy outbox_no_client_read on notification_outbox
  for select using (false);
