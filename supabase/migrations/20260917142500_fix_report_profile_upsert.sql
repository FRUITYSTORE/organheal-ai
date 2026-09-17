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
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_username text;
begin
  if v_user_id is null then
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

  v_email :=
    nullif(
      auth.jwt() ->> 'email',
      ''
    );

  v_username :=
    nullif(
      trim(
        auth.jwt()
          -> 'user_metadata'
          ->> 'username'
      ),
      ''
    );

  insert into public.profiles (
    id,
    email,
    username,
    full_name,
    date_of_birth,
    sex_at_birth,
    report_identity_preference
  )
  values (
    v_user_id,
    v_email,
    v_username,
    nullif(trim(p_full_name), ''),
    p_date_of_birth,
    p_sex_at_birth,
    p_report_identity_preference
  )
  on conflict (id)
  do update set
    full_name =
      excluded.full_name,
    date_of_birth =
      excluded.date_of_birth,
    sex_at_birth =
      excluded.sex_at_birth,
    report_identity_preference =
      excluded.report_identity_preference;
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