-- Sổ Từ — Storage buckets (docs/PLAN.md §6, §8.2)
-- Both buckets are public-read with unguessable object names ({user_id}/{uuid}.webp).
-- Restricting reads to "people who can read the deck" would require signed URLs
-- for every image; the random path is the access control (documented deviation).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 1048576, array['image/webp', 'image/jpeg', 'image/png']),
  ('word-images', 'word-images', true, 524288, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "images: upload into own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars', 'word-images')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "images: owner updates"
  on storage.objects for update to authenticated
  using (bucket_id in ('avatars', 'word-images') and owner_id = auth.uid()::text);

create policy "images: owner deletes"
  on storage.objects for delete to authenticated
  using (bucket_id in ('avatars', 'word-images') and owner_id = auth.uid()::text);
