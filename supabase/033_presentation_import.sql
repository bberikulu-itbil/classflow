-- Original presentation files are stored without conversion.
-- The lesson keeps the source URL so the web app can open the original
-- .pptx/.pdf in a browser viewer and offer the file itself as a fallback.
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
