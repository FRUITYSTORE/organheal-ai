-- OrganHeal AI Lab Reports Storage Security
-- Restricts authenticated users to their own folder
-- inside the private lab-reports bucket.

drop policy if exists
  "Authenticated users can upload lab reports"
on storage.objects;

drop policy if exists
  "Authenticated users can view lab reports"
on storage.objects;

drop policy if exists
  "Authenticated users can delete lab reports"
on storage.objects;

create policy
  "Authenticated users can upload lab reports"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'lab-reports'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy
  "Authenticated users can view lab reports"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'lab-reports'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy
  "Authenticated users can delete lab reports"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'lab-reports'
  and (storage.foldername(name))[1] = auth.uid()::text
);