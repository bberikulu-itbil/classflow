-- Pictures on lecture slides: a public bucket (slides carry the plain URL), teachers write only under their own school's folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cf-media', 'cf-media', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists cfmedia_read on storage.objects;
drop policy if exists cfmedia_ins on storage.objects;
drop policy if exists cfmedia_del on storage.objects;
create policy cfmedia_read on storage.objects for select to authenticated
  using (bucket_id = 'cf-media' and is_staff() and (storage.foldername(name))[1] = my_school()::text);
create policy cfmedia_ins on storage.objects for insert to authenticated
  with check (bucket_id = 'cf-media' and is_staff() and (storage.foldername(name))[1] = my_school()::text);
create policy cfmedia_del on storage.objects for delete to authenticated
  using (bucket_id = 'cf-media' and is_staff() and (storage.foldername(name))[1] = my_school()::text);
