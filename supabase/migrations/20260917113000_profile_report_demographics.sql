alter table public.profiles
  add column if not exists full_name text,
  add column if not exists date_of_birth date,
  add column if not exists sex_at_birth text,
  add column if not exists report_identity_preference text
    not null
    default 'ask';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_sex_at_birth_check'
  ) then
    alter table public.profiles
      add constraint profiles_sex_at_birth_check
      check (
        sex_at_birth is null
        or sex_at_birth in (
          'male',
          'female',
          'intersex',
          'unknown',
          'prefer_not_to_say'
        )
      );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_report_identity_preference_check'
  ) then
    alter table public.profiles
      add constraint profiles_report_identity_preference_check
      check (
        report_identity_preference in (
          'ask',
          'identified',
          'deidentified'
        )
      );
  end if;
end
$$;

create or replace function public.update_my_report_profile(
  p_full_name text,
  p_date_of_birth date,
  p_sex_at_birth text,
  p_report_identity_preference text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_sex_at_birth is not null
     and p_sex_at_birth not in (
       'male',
       'female',
       'intersex',
       'unknown',
       'prefer_not_to_say'
     ) then
    raise exception 'Invalid sex_at_birth';
  end if;

  if p_report_identity_preference not in (
    'ask',
    'identified',
    'deidentified'
  ) then
    raise exception 'Invalid report identity preference';
  end if;

  update public.profiles
  set
    full_name = nullif(trim(p_full_name), ''),
    date_of_birth = p_date_of_birth,
    sex_at_birth = p_sex_at_birth,
    report_identity_preference = p_report_identity_preference
  where id = auth.uid();

  if not found then
    raise exception 'Profile not found';
  end if;
end;
$$;

revoke all
on function public.update_my_report_profile(
  text,
  date,
  text,
  text
)
from public;

grant execute
on function public.update_my_report_profile(
  text,
  date,
  text,
  text
)
to authenticated;