-- 04 · Bucket privado de comprobantes (solo Supabase: el esquema `storage` no existe en PGlite).
-- La imagen se sirve con signed URLs generadas desde el servidor.

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'comprobantes',
      'comprobantes',
      false,
      5242880,
      array['image/png', 'image/jpeg', 'image/webp']
    )
    on conflict (id) do update
      set public = false,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;
  end if;
end
$$;
