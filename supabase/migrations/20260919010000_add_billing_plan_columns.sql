alter table public.profiles
  add column if not exists plan text
    not null
    default 'free',
  add column if not exists plan_status text,
  add column if not exists plan_interval text,
  add column if not exists plan_current_period_end timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_plan_check'
  ) then
    alter table public.profiles
      add constraint profiles_plan_check
      check (plan in ('free', 'plus'));
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_plan_interval_check'
  ) then
    alter table public.profiles
      add constraint profiles_plan_interval_check
      check (
        plan_interval is null
        or plan_interval in ('month', 'year')
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_plan_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_plan_status_check
      check (
        plan_status is null
        or plan_status in (
          'active',
          'trialing',
          'past_due',
          'canceled',
          'unpaid',
          'incomplete',
          'incomplete_expired',
          'paused'
        )
      );
  end if;
end
$$;

create unique index if not exists profiles_stripe_customer_id_key
  on public.profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists profiles_stripe_subscription_id_key
  on public.profiles (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- Billing state must only ever be written by trusted server code (the
-- checkout/webhook API routes, which use the service-role client), never
-- by a user's own authenticated session. Without this, any signed-in user
-- could grant themselves Plus for free with a direct client-side update,
-- regardless of whatever RLS update policy exists on this table.
create or replace function public.protect_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    new.plan := old.plan;
    new.plan_status := old.plan_status;
    new.plan_interval := old.plan_interval;
    new.plan_current_period_end := old.plan_current_period_end;
    new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_billing_columns_trigger on public.profiles;

create trigger protect_billing_columns_trigger
before update on public.profiles
for each row
execute function public.protect_billing_columns();
