drop policy "read photos" on storage.objects;
create policy "admin read photos" on storage.objects for select to authenticated using (bucket_id = 'product-photos' and public.is_admin());