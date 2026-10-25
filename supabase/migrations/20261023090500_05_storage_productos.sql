-- 05 · Bucket público de fotos de producto (solo Supabase: el esquema `storage` no existe en PGlite).
-- La foto de producto es contenido público de la tienda: se sirve por URL pública y
-- `producto.imagen_url` la guarda. El comprobante sigue privado (migración 04).
-- Subida: siempre server-side con la service role; no hay política de escritura para `anon`.

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'productos',
      'productos',
      true,
      5242880,
      array['image/png', 'image/jpeg', 'image/webp']
    )
    on conflict (id) do update
      set public = true,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;
  end if;
end
$$;
