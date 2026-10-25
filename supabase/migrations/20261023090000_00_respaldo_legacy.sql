-- 00 · Respaldo de las tablas legacy antes de reconstruir el esquema.
-- Idempotente: si el respaldo ya existe, no lo pisa. Si la base ya es la nueva, no hace nada.
--
-- El respaldo contiene datos personales y `admin.contrasenia` en texto plano. Queda en un esquema
-- propio y se cierra explícitamente a `anon` y `authenticated`: en Supabase esos roles pueden tener
-- grants directos, así que revocar solo de `public` no alcanza.

do $$
declare
  v_tabla text;
  v_rol text;
  v_tablas text[] := array[
    'producto',
    'stock',
    'cliente',
    'pedido',
    'detalle_pedido',
    'detalle_del_pedido',
    'comprobante',
    'estados_pedidos',
    'estados_comprobante',
    'remitos_de_venta',
    'alerta_de_estado',
    'detalle_carrito',
    'admin',
    'roll'
  ];
begin
  -- Marcador del esquema legacy: `producto.id_stock` (FK recíproca que se retira).
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'producto'
       and column_name = 'id_stock'
  ) then
    execute 'create schema if not exists "respaldo_legacy"';

    foreach v_tabla in array v_tablas loop
      if to_regclass(format('public.%I', v_tabla)) is not null
         and to_regclass(format('respaldo_legacy.%I', v_tabla)) is null then
        execute format(
          'create table "respaldo_legacy".%I as table public.%I',
          v_tabla,
          v_tabla
        );
      end if;
    end loop;

    execute 'revoke all on schema "respaldo_legacy" from public';

    -- Explícito por rol: si el rol todavía no existe (base limpia), se crea en la migración 03
    -- y allí se vuelve a revocar. Si ya existe (Supabase), se cierra acá.
    foreach v_rol in array array['anon', 'authenticated'] loop
      if exists (select 1 from pg_roles where rolname = v_rol) then
        execute format('revoke all on schema "respaldo_legacy" from %I', v_rol);
        execute format(
          'revoke all on all tables in schema "respaldo_legacy" from %I',
          v_rol
        );
      end if;
    end loop;

    execute 'comment on schema "respaldo_legacy" is ''Respaldo previo a la migración MVP del 2026-10-23. Contiene datos personales: no exponer a anon.''';
  end if;
end
$$;
