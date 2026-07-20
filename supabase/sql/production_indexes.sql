-- OrganHeal AI Production Indexes
-- Review in Supabase SQL Editor before running.
-- Add indexes gradually and verify table/column existence first.

create index if not exists idx_profiles_id
on profiles(id);

create index if not exists idx_organ_assessments_user_created
on organ_assessments(user_id, created_at desc);

create index if not exists idx_daily_checkins_user_created
on daily_checkins(user_id, created_at desc);

create index if not exists idx_uploaded_lab_files_user_created
on uploaded_lab_files(user_id, created_at desc);

create index if not exists idx_health_insights_user_created
on health_insights(user_id, created_at desc);

create index if not exists idx_health_insights_user_report
on health_insights(user_id, report_id);

create index if not exists idx_generated_results_user_updated
on generated_intelligence_results(user_id, updated_at desc);

create index if not exists idx_generated_results_user_insight
on generated_intelligence_results(user_id, insight_id);

create index if not exists idx_health_history_user_created
on health_history(user_id, created_at desc);
create index if not exists idx_generated_results_user_created
on generated_intelligence_results(user_id, created_at desc);

create index if not exists idx_medical_report_markers_user_created
on medical_report_markers(user_id, created_at asc);