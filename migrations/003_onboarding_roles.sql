-- Immutable first-run onboarding role. The role is selected once after auth
-- and is never changed by a client-side toggle.
alter table app_users add column if not exists role text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_users_role_check'
      and conrelid = 'public.app_users'::regclass
  ) then
    alter table app_users
      add constraint app_users_role_check
      check (role is null or role in ('employer', 'employee', 'contractor'));
  end if;
end $$;

create index if not exists app_users_role_idx on app_users (role);

-- Employees and contractors may request access to an existing company. The
-- request is separate from the immutable app role and must be approved by an
-- employer before it becomes an active membership.
