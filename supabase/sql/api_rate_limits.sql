create table if not exists public.api_rate_limits (
  rate_limit_key text primary key,
  request_count integer not null default 0,
  window_started_at timestamptz not null,
  window_expires_at timestamptz not null,
  updated_at timestamptz not null default now(),

  constraint api_rate_limits_request_count_check
    check (request_count >= 0),

  constraint api_rate_limits_window_check
    check (window_expires_at > window_started_at)
);

create index if not exists
  idx_api_rate_limits_window_expires_at
on public.api_rate_limits (
  window_expires_at
);

alter table public.api_rate_limits
enable row level security;

revoke all
on table public.api_rate_limits
from anon, authenticated;

create or replace function public.consume_api_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (
  allowed boolean,
  request_count integer,
  remaining integer,
  reset_at timestamptz,
  retry_after_seconds integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz :=
    clock_timestamp();

  v_count integer;

  v_reset_at timestamptz;
begin
  if
    p_key is null or
    btrim(p_key) = ''
  then
    raise exception
      'Rate limit key is required.';
  end if;

  if
    p_limit <= 0 or
    p_window_seconds <= 0
  then
    raise exception
      'Rate limit values must be positive.';
  end if;

  insert into public.api_rate_limits (
    rate_limit_key,
    request_count,
    window_started_at,
    window_expires_at,
    updated_at
  )
  values (
    p_key,
    1,
    v_now,
    v_now +
      make_interval(
        secs => p_window_seconds
      ),
    v_now
  )
  on conflict (
    rate_limit_key
  )
  do update
  set
    request_count =
      case
        when
          public.api_rate_limits.window_expires_at <=
          v_now
        then
          1
        else
          public.api_rate_limits.request_count +
          1
      end,

    window_started_at =
      case
        when
          public.api_rate_limits.window_expires_at <=
          v_now
        then
          v_now
        else
          public.api_rate_limits.window_started_at
      end,

    window_expires_at =
      case
        when
          public.api_rate_limits.window_expires_at <=
          v_now
        then
          v_now +
          make_interval(
            secs => p_window_seconds
          )
        else
          public.api_rate_limits.window_expires_at
      end,

    updated_at =
      v_now

  returning
    public.api_rate_limits.request_count,
    public.api_rate_limits.window_expires_at
  into
    v_count,
    v_reset_at;

  return query
  select
    v_count <= p_limit,

    v_count,

    greatest(
      p_limit - v_count,
      0
    ),

    v_reset_at,

    case
      when
        v_count <= p_limit
      then
        0
      else
        greatest(
          1,
          ceil(
            extract(
              epoch
              from
                (
                  v_reset_at -
                  v_now
                )
            )
          )::integer
        )
    end;
end;
$$;

revoke all
on function public.consume_api_rate_limit(
  text,
  integer,
  integer
)
from public, anon, authenticated;

grant execute
on function public.consume_api_rate_limit(
  text,
  integer,
  integer
)
to service_role;
create or replace function public.cleanup_expired_api_rate_limits(
  p_retention_seconds integer default 3600
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_count integer;
begin
  if
    p_retention_seconds < 0
  then
    raise exception
      'Retention seconds must not be negative.';
  end if;

  delete from public.api_rate_limits
  where
    window_expires_at <
    clock_timestamp() -
      make_interval(
        secs => p_retention_seconds
      );

  get diagnostics
    v_deleted_count =
      row_count;

  return
    v_deleted_count;
end;
$$;

revoke all
on function public.cleanup_expired_api_rate_limits(
  integer
)
from public, anon, authenticated;

grant execute
on function public.cleanup_expired_api_rate_limits(
  integer
)
to service_role;