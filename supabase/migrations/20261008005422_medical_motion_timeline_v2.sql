begin;
-- Additive internal V2 provenance. V1 approval and single-base rows are not reinterpreted.
create table public.medical_motion_timeline_compositions (
 artifact_id uuid primary key references public.medical_motion_artifacts(id) on delete restrict,
 job_id uuid not null unique, user_id uuid not null, context_id uuid not null,
 spec_id uuid not null references public.medical_motion_approved_specs(id) on delete restrict,
 origin_attempt uuid not null, timeline_fingerprint text not null check(timeline_fingerprint ~ '^[a-f0-9]{64}$'),
 fingerprint text not null check(fingerprint ~ '^[a-f0-9]{64}$'),
 foreign key(job_id,user_id) references public.background_jobs(id,user_id) on delete restrict,
 foreign key(context_id,user_id) references public.medical_motion_execution_contexts(id,user_id) on delete restrict
);
create table public.medical_motion_timeline_segments (
 artifact_id uuid not null references public.medical_motion_timeline_compositions(artifact_id) on delete restrict,
 segment_index integer not null check(segment_index between 0 and 7), identity jsonb not null,
 base_job_id uuid not null references public.background_jobs(id) on delete restrict,
 base_artifact_id uuid not null references public.medical_motion_artifacts(id) on delete restrict,
 cache_key text not null references public.medical_motion_reuse_keys(cache_key) on delete restrict,
 reuse_epoch bigint not null check(reuse_epoch>0), primary key(artifact_id,segment_index),
 check(identity->>'baseJobId'=base_job_id::text and identity->>'baseArtifactId'=base_artifact_id::text and identity->'segmentIndex'=to_jsonb(segment_index))
);
alter table public.medical_motion_timeline_compositions enable row level security;
alter table public.medical_motion_timeline_segments enable row level security;
revoke all on public.medical_motion_timeline_compositions,public.medical_motion_timeline_segments from public,anon,authenticated,service_role;
create trigger timeline_compositions_immutable before update or delete on public.medical_motion_timeline_compositions for each row execute function public.reject_background_job_result_mutation();
create trigger timeline_segments_immutable before update or delete on public.medical_motion_timeline_segments for each row execute function public.reject_background_job_result_mutation();

create function public.validate_motion_timeline_presentation_v2(p jsonb,duration numeric)
returns boolean language plpgsql set search_path='' as $$
declare kind text; v jsonb; seg jsonb; start_time numeric; end_time numeric;
begin
 if jsonb_typeof(p) is distinct from 'object' or (select count(*) from jsonb_object_keys(p))<>9 or
  not(p ?& array['compositionVersion','baseAudio','outputProfile','language','textOverlays','numericOverlays','chartOverlays','audioSegments','dynamicNarrationSlots']) or
  p->>'compositionVersion' is distinct from '2' or p->>'baseAudio' is distinct from 'silence' or coalesce(p->>'language','') not in ('ar','en') or
  jsonb_typeof(p->'outputProfile') is distinct from 'object' then return false;end if;
 if (select count(*) from jsonb_object_keys(p->'outputProfile'))<>3 or not(p->'outputProfile' ?& array['aspectRatio','policy','resolution']) or
  coalesce(p->'outputProfile'->>'aspectRatio','') not in ('16:9','9:16','1:1') or p->'outputProfile'->>'policy' is distinct from 'fit' or p->'outputProfile'->>'resolution' is distinct from '720p' then return false;end if;
 foreach kind in array array['textOverlays','numericOverlays','chartOverlays','audioSegments','dynamicNarrationSlots'] loop
  if jsonb_typeof(p->kind) is distinct from 'array' then return false;end if;
  if jsonb_array_length(p->kind)>20 then return false;end if;
  for v in select value from jsonb_array_elements(p->kind) loop
   if jsonb_typeof(v) is distinct from 'object' or jsonb_typeof(v->'start') is distinct from 'number' then return false;end if;
   start_time:=(v->>'start')::numeric;
   if kind in ('textOverlays','numericOverlays','chartOverlays') then
    if jsonb_typeof(v->'end') is distinct from 'number' then return false;end if;end_time:=(v->>'end')::numeric;
    if kind='textOverlays' then
     if (select count(*) from jsonb_object_keys(v))<>4 or not(v ?& array['slot','start','end','text']) or jsonb_typeof(v->'text') is distinct from 'string' or length(v->>'text') not between 1 and 240 or coalesce(v->>'slot','') not in ('text-value','caption','subtitle','risk-band','educational-label') then return false;end if;
    elsif kind='numericOverlays' then
     if (select count(*) from jsonb_object_keys(v))<>5 or not(v ?& array['slot','start','end','value','unit']) or v->>'slot' is distinct from 'text-value' or jsonb_typeof(v->'value') is distinct from 'number' or abs((v->>'value')::numeric)>1e9 or jsonb_typeof(v->'unit') is distinct from 'string' or length(v->>'unit') not between 1 and 24 then return false;end if;
    else
     if (select count(*) from jsonb_object_keys(v))<>9 or not(v ?& array['slot','start','end','kind','values','minimum','maximum','label','interpretation']) or v->>'slot' is distinct from 'chart' or v->>'interpretation' is distinct from 'descriptive-only' or coalesce(v->>'kind','') not in ('trend','range-marker','band','comparison') or
      jsonb_typeof(v->'minimum') is distinct from 'number' or jsonb_typeof(v->'maximum') is distinct from 'number' or jsonb_typeof(v->'label') is distinct from 'string' or length(v->>'label') not between 1 and 80 or jsonb_typeof(v->'values') is distinct from 'array' then return false;end if;
     if jsonb_array_length(v->'values') not between 1 and 20 or (v->>'maximum')::numeric<=(v->>'minimum')::numeric or exists(select 1 from jsonb_array_elements(v->'values') x where jsonb_typeof(x)<>'number' or x::text::numeric not between (v->>'minimum')::numeric and (v->>'maximum')::numeric) then return false;end if;
    end if;
   else
    if (select count(*) from jsonb_object_keys(v))<>3 or not(v ?& array['slot','start','segment']) or v->>'slot' is distinct from 'voice-segment' or jsonb_typeof(v->'segment') is distinct from 'object' then return false;end if;
    seg:=v->'segment';
    if (select count(*) from jsonb_object_keys(seg))<>9 or not(seg ?& array['segmentId','version','language','textFingerprint','medicalReviewStatus','audioArtifactId','audioSha256','duration','reuseScope']) or
     coalesce(seg->>'segmentId','') !~ '^[A-Za-z0-9_-]{1,64}$' or coalesce(seg->>'version','') !~ '^[A-Za-z0-9_.-]{1,32}$' or seg->>'language' is distinct from p->>'language' or seg->>'medicalReviewStatus' is distinct from 'approved' or
     coalesce(seg->>'textFingerprint','') !~ '^[a-f0-9]{64}$' or coalesce(seg->>'audioSha256','') !~ '^[a-f0-9]{64}$' or coalesce(seg->>'audioArtifactId','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' or jsonb_typeof(seg->'duration') is distinct from 'number' or (seg->>'duration')::numeric<=0 or
     seg->>'reuseScope' is distinct from (case when kind='audioSegments' then 'reusable-no-phi' else 'private-context' end) then return false;end if;
    end_time:=start_time+(seg->>'duration')::numeric;
   end if;
   if start_time<0 or end_time<=start_time or end_time>duration then return false;end if;
  end loop;
 end loop;
 if jsonb_array_length(p->'textOverlays')+jsonb_array_length(p->'numericOverlays')+jsonb_array_length(p->'chartOverlays')>24 or jsonb_array_length(p->'audioSegments')+jsonb_array_length(p->'dynamicNarrationSlots')>12 then return false;end if;
 if exists(with entries as (select entry->>'slot' slot,(entry->>'start')::numeric start_time,(entry->>'end')::numeric end_time,row_number() over() idx from jsonb_array_elements((p->'textOverlays')||(p->'numericOverlays')||(p->'chartOverlays')) as e(entry))
  select 1 from entries a join entries b on a.idx<b.idx and a.slot=b.slot and a.start_time<b.end_time and b.start_time<a.end_time) then return false;end if;
 if exists(with entries as (select (entry->>'start')::numeric start_time,(entry->>'start')::numeric+(entry->'segment'->>'duration')::numeric end_time,row_number() over() idx from jsonb_array_elements((p->'audioSegments')||(p->'dynamicNarrationSlots')) as e(entry))
  select 1 from entries a join entries b on a.idx<b.idx and a.start_time<b.end_time and b.start_time<a.end_time) then return false;end if;
 return true;
exception when invalid_text_representation or numeric_value_out_of_range then return false;
end $$;
revoke all on function public.validate_motion_timeline_presentation_v2(jsonb,numeric) from public,anon,authenticated,service_role;

create function public.validate_motion_timeline_v2(p_user_id uuid,p_content jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare s jsonb; t jsonb; i integer:=0; duration numeric:=0; c public.medical_motion_execution_contexts%rowtype;
begin
 if p_content is null or jsonb_typeof(p_content)<>'object' or octet_length(p_content::text)>65536 or
  (select count(*) from jsonb_object_keys(p_content))<>13 or not(p_content ?& array['schemaVersion','producerVersion','compositionVersion','userId','contextId','segments','transitions','duration','timelineFingerprint','fingerprint','logicalIdentity','approvalDisposition','specification']) then return false; end if;
 -- Thirteen keys; strict shape prevents untrusted authority from being smuggled into the envelope.
 if p_content->>'schemaVersion' is distinct from '2' or p_content->>'producerVersion' is distinct from '1' or p_content->>'compositionVersion' is distinct from '2' or
  p_content->>'userId' is distinct from p_user_id::text or p_content->>'approvalDisposition' is distinct from 'internal-composition' or
  coalesce(p_content->>'timelineFingerprint','') !~ '^[a-f0-9]{64}$' or coalesce(p_content->>'fingerprint','') !~ '^[a-f0-9]{64}$' or coalesce(p_content->>'logicalIdentity','') !~ '^[a-f0-9]{64}$' or
  jsonb_typeof(p_content->'segments') is distinct from 'array' or jsonb_typeof(p_content->'transitions') is distinct from 'array' or jsonb_typeof(p_content->'duration') is distinct from 'number' then return false; end if;
 if jsonb_array_length(p_content->'segments') not between 2 and 8 or jsonb_array_length(p_content->'transitions')<>jsonb_array_length(p_content->'segments')-1 then return false; end if;
 select x.* into c from public.medical_motion_execution_contexts x where x.id=(p_content->>'contextId')::uuid and x.user_id=p_user_id;
 if not found or c.source_profile_bindings is null then return false; end if;
 for s in select value from jsonb_array_elements(p_content->'segments') loop
  if jsonb_typeof(s)<>'object' or (select count(*) from jsonb_object_keys(s))<>10 or not(s ?& array['segmentIndex','sceneIndex','baseJobId','baseArtifactId','baseSha256','baseFingerprint','baseOutputFingerprint','renderSignature','duration','sourceProfile']) or
   s->'segmentIndex' is distinct from to_jsonb(i) or jsonb_typeof(s->'sceneIndex') is distinct from 'number' or coalesce(s->>'sceneIndex','') !~ '^[0-9]{1,4}$' or (s->>'sceneIndex')::integer>1023 or
   jsonb_typeof(s->'duration') is distinct from 'number' or (s->>'duration')::numeric<=0 or (s->>'duration')::numeric>60 or
   (s->>'duration')::numeric*25<>round((s->>'duration')::numeric*25) or
   not exists(select 1 from jsonb_array_elements(c.source_profile_bindings->'scenes') b where b->'sceneIndex'=s->'sceneIndex' and b->'profile'=s->'sourceProfile') or
   not(s->'sourceProfile'->'usage' @> '["internal-review"]'::jsonb) or
   exists(select 1 from jsonb_array_elements(p_content->'segments') other where other->>'baseArtifactId'=s->>'baseArtifactId' and other->'segmentIndex'<>s->'segmentIndex') then return false; end if;
  if not exists(select 1 from public.read_published_motion_artifact((s->>'baseJobId')::uuid,p_user_id) a
   join public.medical_motion_reuse_links l on l.job_id=(s->>'baseJobId')::uuid and l.artifact_id=a.id
   join public.medical_motion_reuse_keys k on k.cache_key=l.cache_key
   join public.background_jobs j on j.id=l.job_id
   where a.id=(s->>'baseArtifactId')::uuid and a.media='video' and a.sha256=s->>'baseSha256' and
    k.state='ready' and k.epoch=l.epoch and k.artifact_id=a.id and k.identity->>'media'='video' and k.identity->>'scope'='internal-review' and
    k.identity->>'baseFingerprint'=s->>'baseFingerprint' and k.identity->>'outputFingerprint'=s->>'baseOutputFingerprint' and k.identity->>'renderSignature'=s->>'renderSignature' and
    k.identity->'sourceProfile'=jsonb_build_object('profileId',s->'sourceProfile'->>'profileId','profileVersion',s->'sourceProfile'->>'profileVersion','fingerprint',s->'sourceProfile'->>'fingerprint') and
    j.execution_context_id=c.id and j.payload->'sceneIndex'=s->'sceneIndex' and
    not exists(select 1 from public.medical_motion_compositions v where v.artifact_id=a.id) and
    not exists(select 1 from public.medical_motion_timeline_compositions v where v.artifact_id=a.id)) then return false; end if;
  duration:=duration+(s->>'duration')::numeric; i:=i+1;
 end loop;
 if duration>60 or duration<>(p_content->>'duration')::numeric then return false; end if;
 i:=0;
 for t in select value from jsonb_array_elements(p_content->'transitions') loop
  if jsonb_typeof(t)<>'object' or (select count(*) from jsonb_object_keys(t))<>3 or not(t ?& array['boundaryIndex','kind','duration']) or t->'boundaryIndex' is distinct from to_jsonb(i) or coalesce(t->>'kind','') not in ('cut','fade-through-neutral') or
   jsonb_typeof(t->'duration') is distinct from 'number' or not(t->>'kind'='cut' and (t->>'duration')::numeric=0 or t->>'kind'='fade-through-neutral' and (t->>'duration')::numeric between .15 and .75) or
   (t->>'duration')::numeric/2>=least((p_content->'segments'->i->>'duration')::numeric,(p_content->'segments'->(i+1)->>'duration')::numeric) then return false; end if;
  i:=i+1;
 end loop;
 if exists(select 1 from jsonb_array_elements(p_content->'segments') with ordinality as v(timeline_segment,n) where
  ((case when n>1 then coalesce((p_content->'transitions'->(n::integer-2)->>'duration')::numeric,0) else 0 end)+coalesce((p_content->'transitions'->(n::integer-1)->>'duration')::numeric,0))/2 >= (timeline_segment->>'duration')::numeric) then return false;end if;
 if not public.validate_motion_timeline_presentation_v2(p_content->'specification',duration) then return false;end if;
 return true;
exception when invalid_text_representation or numeric_value_out_of_range then return false;
end $$;
revoke all on function public.validate_motion_timeline_v2(uuid,jsonb) from public,anon,authenticated,service_role;

create function public.approve_motion_timeline_v2(p_user_id uuid,p_content jsonb)
returns table(id uuid,job_id uuid,user_id uuid,content jsonb,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare item public.medical_motion_approved_specs%rowtype; spec_id uuid; work_id uuid;
begin
 if not public.validate_motion_timeline_v2(p_user_id,p_content) then raise exception 'TIMELINE_INVALID' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text||':'||(p_content->>'logicalIdentity'),0));
 select s.* into item from public.medical_motion_approved_specs s where s.user_id=p_user_id and s.context_id=(p_content->>'contextId')::uuid and s.logical_identity=p_content->>'logicalIdentity';
 if found then
  if item.content is distinct from p_content then raise exception 'TIMELINE_CONFLICT' using errcode='OM409'; end if;
 else
  spec_id:=gen_random_uuid();work_id:=gen_random_uuid();
  insert into public.medical_motion_approved_specs(id,user_id,context_id,job_id,logical_identity,content)
   values(spec_id,p_user_id,(p_content->>'contextId')::uuid,work_id,p_content->>'logicalIdentity',p_content) returning * into item;
  insert into public.background_jobs(id,user_id,request_id,job_type,payload,execution_context_id,approved_personalization_spec_id,available_at)
   values(work_id,p_user_id,work_id::text,'medical-motion-compose',jsonb_build_object('approvedPersonalizationSpecId',spec_id::text,'compositionVersion','2'),item.context_id,spec_id,clock_timestamp());
 end if;
 return query select item.id,item.job_id,item.user_id,item.content,item.created_at;
end $$;
revoke all on function public.approve_motion_timeline_v2(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.approve_motion_timeline_v2(uuid,jsonb) to service_role;

create function public.motion_timeline_operation_v2(p_job_id uuid,p_user_id uuid,p_attempt_token uuid,p_action text,p_artifact_id uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare owned public.background_jobs%rowtype; spec public.medical_motion_approved_specs%rowtype; item public.medical_motion_timeline_compositions%rowtype; s jsonb; k public.medical_motion_reuse_keys%rowtype;
begin
 select j.* into owned from public.background_jobs j where j.id=p_job_id for update;
 if not found or owned.user_id is distinct from p_user_id or owned.job_type<>'medical-motion-compose' or owned.status<>'running' or p_attempt_token is null or owned.attempt_token is distinct from p_attempt_token or owned.lease_expires_at<=clock_timestamp() then raise exception 'TIMELINE_OWNERSHIP_LOST' using errcode='OM403';end if;
 select a.* into spec from public.medical_motion_approved_specs a where a.id=owned.approved_personalization_spec_id and a.job_id=owned.id and a.user_id=p_user_id;
 if not found or spec.content->>'compositionVersion' is distinct from '2' then raise exception 'TIMELINE_INVALID' using errcode='22023';end if;
 -- Lock reuse keys in deterministic order through final insertion/publication transaction.
 perform 1 from public.medical_motion_reuse_keys rk where rk.artifact_id in (select (x->>'baseArtifactId')::uuid from jsonb_array_elements(spec.content->'segments') x) order by rk.cache_key for update;
 if not found or spec.content->>'compositionVersion' is distinct from '2' or not public.validate_motion_timeline_v2(p_user_id,spec.content) then raise exception 'TIMELINE_STALE' using errcode='OM409';end if;
 select c.* into item from public.medical_motion_timeline_compositions c where c.job_id=owned.id;
 if p_action in ('check','intent') then
  if item.artifact_id is not null and (item.spec_id<>spec.id or item.fingerprint<>spec.content->>'fingerprint' or
   exists(select 1 from public.medical_motion_timeline_segments ts join public.medical_motion_reuse_keys rk on rk.cache_key=ts.cache_key where ts.artifact_id=item.artifact_id and ts.reuse_epoch<>rk.epoch)) then raise exception 'TIMELINE_STALE' using errcode='OM409';end if;
  return item.artifact_id;
 elsif p_action<>'register' or p_artifact_id is null then raise exception 'TIMELINE_INVALID' using errcode='22023';end if;
 if not exists(select 1 from public.medical_motion_artifacts a where a.id=p_artifact_id and a.job_id=owned.id and a.user_id=p_user_id and a.origin_attempt=p_attempt_token and a.media='video') or
  exists(select 1 from public.medical_motion_compositions c where c.artifact_id=p_artifact_id) or
  exists(select 1 from public.medical_motion_reuse_links l where l.job_id=owned.id or l.artifact_id=p_artifact_id) or
  exists(select 1 from public.medical_motion_reuse_keys rk where rk.producer_job_id=owned.id or rk.artifact_id=p_artifact_id) then raise exception 'TIMELINE_INVALID' using errcode='22023';end if;
 if item.artifact_id is not null then
  if item.artifact_id<>p_artifact_id then raise exception 'TIMELINE_CONFLICT' using errcode='OM409';end if;return item.artifact_id;
 end if;
 insert into public.medical_motion_timeline_compositions(artifact_id,job_id,user_id,context_id,spec_id,origin_attempt,timeline_fingerprint,fingerprint)
  values(p_artifact_id,owned.id,p_user_id,spec.context_id,spec.id,p_attempt_token,spec.content->>'timelineFingerprint',spec.content->>'fingerprint');
 for s in select value from jsonb_array_elements(spec.content->'segments') loop
  select rk.* into strict k from public.medical_motion_reuse_links l join public.medical_motion_reuse_keys rk on rk.cache_key=l.cache_key where l.job_id=(s->>'baseJobId')::uuid and l.artifact_id=(s->>'baseArtifactId')::uuid;
  insert into public.medical_motion_timeline_segments(artifact_id,segment_index,identity,base_job_id,base_artifact_id,cache_key,reuse_epoch) values(p_artifact_id,(s->>'segmentIndex')::integer,s,(s->>'baseJobId')::uuid,(s->>'baseArtifactId')::uuid,k.cache_key,k.epoch);
 end loop;
 if owned.lease_expires_at<=clock_timestamp() then raise exception 'TIMELINE_OWNERSHIP_LOST' using errcode='OM403';end if;
 return p_artifact_id;
end $$;
revoke all on function public.motion_timeline_operation_v2(uuid,uuid,uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.motion_timeline_operation_v2(uuid,uuid,uuid,text,uuid) to service_role;

-- Mutual exclusion and private-output reuse protection apply to both models.
create function public.guard_timeline_boundary_v2() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_table_name='medical_motion_compositions' then
  if exists(select 1 from public.medical_motion_timeline_compositions c where c.artifact_id=new.artifact_id or c.artifact_id=new.base_artifact_id or c.job_id=new.job_id) then raise exception 'TIMELINE_MODEL_CONFLICT' using errcode='OM409';end if;
 elsif tg_table_name='medical_motion_reuse_keys' then
  if exists(select 1 from public.medical_motion_timeline_compositions c where c.artifact_id=new.artifact_id or c.job_id=new.producer_job_id) then raise exception 'PRIVATE_TIMELINE_NOT_REUSABLE' using errcode='OM409';end if;
 elsif tg_table_name='medical_motion_reuse_links' then
  if exists(select 1 from public.medical_motion_timeline_compositions c where c.artifact_id=new.artifact_id or c.job_id=new.job_id) then raise exception 'PRIVATE_TIMELINE_NOT_REUSABLE' using errcode='OM409';end if;
 end if;return new;
end $$;
revoke all on function public.guard_timeline_boundary_v2() from public,anon,authenticated,service_role;
create trigger timeline_excludes_v1 before insert on public.medical_motion_compositions for each row execute function public.guard_timeline_boundary_v2();
create trigger timeline_excludes_reuse before insert or update on public.medical_motion_reuse_keys for each row execute function public.guard_timeline_boundary_v2();
create trigger timeline_excludes_link before insert on public.medical_motion_reuse_links for each row execute function public.guard_timeline_boundary_v2();

create or replace function public.guard_approved_composition_job() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then
  if old.job_type='medical-motion-compose' then raise exception 'COMPOSITION_JOB_IMMUTABLE' using errcode='55000'; end if;
  return old;
 end if;
 if tg_op='UPDATE' and old.job_type='medical-motion-compose' and
   (new.id,new.user_id,new.job_type,new.payload,new.execution_context_id,new.approved_personalization_spec_id,new.request_id)
   is distinct from (old.id,old.user_id,old.job_type,old.payload,old.execution_context_id,old.approved_personalization_spec_id,old.request_id)
   then raise exception 'COMPOSITION_JOB_IMMUTABLE' using errcode='55000'; end if;
 if new.job_type='medical-motion-compose' then
  if tg_op='INSERT' and current_user <> pg_get_userbyid((select relowner from pg_class where oid='public.background_jobs'::regclass))
   then raise exception 'COMPOSITION_ATOMIC_APPROVAL_REQUIRED' using errcode='42501'; end if;
  if new.payload is distinct from jsonb_build_object('approvedPersonalizationSpecId',new.approved_personalization_spec_id::text,'compositionVersion',(select s.content->>'compositionVersion' from public.medical_motion_approved_specs s where s.id=new.approved_personalization_spec_id))
   or not exists(select 1 from public.medical_motion_approved_specs s where s.id=new.approved_personalization_spec_id
    and s.user_id=new.user_id and s.context_id=new.execution_context_id and s.job_id=new.id)
   then raise exception 'COMPOSITION_JOB_INVALID' using errcode='22023'; end if;
 end if;
 return new;
end $$;
create or replace function public.bind_motion_artifact_result() returns trigger language plpgsql set search_path='' as $$
declare owned public.background_jobs%rowtype; link public.medical_motion_reuse_links%rowtype; slot public.medical_motion_reuse_keys%rowtype;
begin
  select j.* into owned from public.background_jobs j where j.id=new.job_id;
  if owned.job_type='medical-motion-compose' and owned.payload->>'compositionVersion'='2' then
    if public.motion_timeline_operation_v2(owned.id,owned.user_id,new.attempt_token,'check') is distinct from new.reference_id or
      not exists(select 1 from public.medical_motion_artifacts a where a.id=new.reference_id and a.persisted_at is not null and a.job_id=owned.id and a.user_id=owned.user_id) or
      (select count(*) from public.medical_motion_timeline_segments ts where ts.artifact_id=new.reference_id) is distinct from
      (select jsonb_array_length(s.content->'segments') from public.medical_motion_approved_specs s where s.id=owned.approved_personalization_spec_id) then
      raise exception 'TIMELINE_NOT_PERSISTED' using errcode='OM404';end if;
    new.medical_motion_artifact_id:=new.reference_id;
  elsif owned.job_type='medical-motion-compose' then
    if not exists(select 1 from public.medical_motion_artifacts a join public.medical_motion_compositions c on c.artifact_id=a.id
      join public.medical_motion_approved_specs s on s.id=owned.approved_personalization_spec_id
      where a.id=new.reference_id and a.job_id=owned.id and a.user_id=owned.user_id and a.persisted_at is not null
      and c.job_id=owned.id and c.context_id=s.context_id and c.provenance->>'fingerprint'=s.content->>'fingerprint') then
      raise exception 'COMPOSITION_NOT_PERSISTED' using errcode='OM404'; end if;
    new.medical_motion_artifact_id:=new.reference_id;
  elsif owned.job_type='medical-motion-render' then
    select l.* into link from public.medical_motion_reuse_links l where l.job_id=owned.id and l.attempt_token=new.attempt_token;
    if found then
      select c.* into slot from public.medical_motion_reuse_keys c where c.cache_key=link.cache_key for update;
      if slot.state<>'ready' or slot.epoch<>link.epoch or slot.artifact_id is distinct from new.reference_id
        or link.artifact_id<>new.reference_id then raise exception 'REUSE_STALE_PUBLICATION' using errcode='OM409'; end if;
    elsif exists(select 1 from public.medical_motion_reuse_links l where l.artifact_id=new.reference_id) then
      raise exception 'REUSE_CURRENT_LINK_REQUIRED' using errcode='OM409';
    elsif not exists(select 1 from public.medical_motion_artifacts a where a.id=new.reference_id and a.job_id=owned.id
      and a.user_id=owned.user_id and a.persisted_at is not null) then raise exception 'ARTIFACT_NOT_PERSISTED' using errcode='OM404'; end if;
    if not exists(select 1 from public.medical_motion_artifacts a where a.id=new.reference_id and a.persisted_at is not null)
      then raise exception 'ARTIFACT_NOT_PERSISTED' using errcode='OM404'; end if;
    new.medical_motion_artifact_id:=new.reference_id;
  elsif new.medical_motion_artifact_id is not null then raise exception 'ARTIFACT_INVALID' using errcode='22023'; end if;
  return new;
end $$;
commit;
