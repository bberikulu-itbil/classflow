-- Original presentation files are kept next to the imported slide JSON.
-- The lesson stores a safe rendered representation; this bucket keeps the
-- source .pptx/.pdf available for future re-imports and audit.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cf-presentations',
  'cf-presentations',
  true,
  52428800,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
)
on conflict (id) do update set
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists cf_presentations_read on storage.objects;
drop policy if exists cf_presentations_ins on storage.objects;
drop policy if exists cf_presentations_del on storage.objects;

create policy cf_presentations_read on storage.objects for select to authenticated
  using (bucket_id = 'cf-presentations' and is_staff() and (storage.foldername(name))[1] = my_school()::text);
create policy cf_presentations_ins on storage.objects for insert to authenticated
  with check (bucket_id = 'cf-presentations' and is_staff() and (storage.foldername(name))[1] = my_school()::text);
create policy cf_presentations_del on storage.objects for delete to authenticated
  using (bucket_id = 'cf-presentations' and is_staff() and (storage.foldername(name))[1] = my_school()::text);
