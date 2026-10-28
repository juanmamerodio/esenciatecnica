-- 00 · Respaldo de las tablas legacy antes de reconstruir el esquema.
-- Idempotente: si el respaldo ya existe, no lo pisa. Si la base ya es la nueva, no hace nada.
--
-- El respaldo contiene datos personales y `admin.contrasenia` en texto plano. Queda en un esquema
-- propio y se cierra explícitamente a `anon` y `authenticated`: en Supabase esos roles pueden tener
-- grants directos, así que revocar solo de `public` no alcanza.
--
-- Marcador del esquema legacy (spec `bd-mvp` §2.1 y HU-8): `detalle_carrito` (tabla de fase 2 que
-- se retira) o `stock.porcentaje` (columna vieja que el modelo no tiene). `producto.id_stock` se
-- conserva como señal adicional, pero **no** alcanza: en `otjph` esa columna ya no existe y la
-- versión anterior de esta migración se salteaba el respaldo en silencio.
--
-- Antes de dar el respaldo por bueno se comparan los conteos de origen y copia; si no coinciden,
-- la migración **aborta con error**. `01` destruye las filas actuales: nunca se corre sin red.

do $$
declare
  v_tabla text;
  v_rol text;
  v_filas_origen bigint;
  v_filas_respaldo bigint;
  v_hay_legacy boolean;
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
  select
    exists (
      select 1 from information_schema.tables
       where table_schema = 'public' and table_name = 'detalle_carrito'
    )
    or exists (
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'stock' and column_name = 'porcentaje'
    )
    or exists (
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'producto' and column_name = 'id_stock'
    )
  into v_hay_legacy;

  if not v_hay_legacy then
    return;
  end if;

  execute 'create schema if not exists "respaldo_legacy"';

  -- Conteos previos, tabla por tabla: es la evidencia de que el respaldo quedó completo.
  -- Las tablas del listado que no existían se registran con `presente = false`: así el conteo
  -- cubre las 14 entradas del listado y una tabla ausente no se confunde con una vacía.
  execute $sql$
    create table if not exists "respaldo_legacy".conteos (
      tabla text primary key,
      filas bigint,
      presente boolean not null default true,
      respaldado_en timestamptz not null default now()
    )
  $sql$;
  execute 'alter table "respaldo_legacy".conteos add column if not exists presente boolean not null default true';
  execute 'alter table "respaldo_legacy".conteos alter column filas drop not null';

  foreach v_tabla in array v_tablas loop
    if to_regclass(format('public.%I', v_tabla)) is null then
      execute format(
        'insert into "respaldo_legacy".conteos (tabla, filas, presente) values (%L, null, false)
         on conflict (tabla) do update set filas = null, presente = false, respaldado_en = now()',
        v_tabla
      );
      continue;
    end if;

    if to_regclass(format('respaldo_legacy.%I', v_tabla)) is null then
      execute format(
        'create table "respaldo_legacy".%I as table public.%I',
        v_tabla,
        v_tabla
      );
    end if;

    execute format('select count(*) from public.%I', v_tabla) into v_filas_origen;
    execute format('select count(*) from "respaldo_legacy".%I', v_tabla) into v_filas_respaldo;

    if v_filas_origen <> v_filas_respaldo then
      raise exception
        'Respaldo legacy incompleto en %: % filas en origen y % en respaldo. No se corre 01 sin respaldo verificado.',
        v_tabla, v_filas_origen, v_filas_respaldo;
    end if;

    execute format(
      'insert into "respaldo_legacy".conteos (tabla, filas, presente) values (%L, %s, true)
       on conflict (tabla) do update set filas = excluded.filas, presente = true, respaldado_en = now()',
      v_tabla,
      v_filas_origen
    );
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
end
$$;
