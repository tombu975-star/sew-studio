-- Additive migration — safe to run multiple times.
--
-- Public "uploads" storage bucket for directly-uploaded pictures (profile
-- photos, order style pictures). Files are written ONLY by the server
-- (POST /api/uploads, using the service-role client, after auth + type/size
-- checks) into <shop_id>/<kind>/<uuid>.<ext>; the bucket is public so the
-- returned URL can be used directly in <img src>. No client-side write
-- policies are created — uploads always go through our own API route.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'uploads', 'uploads', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
